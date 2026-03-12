"""
Lead Discovery Tasks - Real lead finding from Google Places API
"""
import os
import uuid
import time
import httpx
from datetime import datetime, timezone
from celery import shared_task
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'automerchant')
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')

PLACES_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"

INDUSTRY_SEARCH_TERMS = {
    "merchant_services": "business",
    "real_estate": "real estate agency",
    "insurance": "insurance agency",
    "saas_software": "software company",
    "home_services": "home services contractor",
    "professional_services": "law firm consulting accounting",
    "restaurant": "restaurant",
    "retail": "retail store",
    "medical_dental": "medical clinic dental office",
    "automotive": "auto repair shop",
    "beauty_salon": "hair salon spa barbershop",
}

def get_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

def calculate_lead_score(lead: dict, scoring_rules: dict) -> int:
    score = scoring_rules.get('base_score', 30)
    rating = lead.get('google_rating', 0) or 0
    if rating >= 4.5:
        score += scoring_rules.get('good_rating', 15)
    elif rating >= 4.0:
        score += scoring_rules.get('good_rating', 15) // 2
    reviews = lead.get('review_count', 0) or 0
    if reviews >= 50:
        score += scoring_rules.get('50_plus_reviews', 15)
    elif reviews >= 20:
        score += scoring_rules.get('50_plus_reviews', 15) // 2
    if lead.get('website'):
        score += scoring_rules.get('website_exists', 10)
    if lead.get('phone'):
        score += 5
    score += scoring_rules.get('high_transaction_industry', 0)
    return min(score, 100)

def fetch_places(query: str, location: str, count: int = 20) -> list:
    if not GOOGLE_PLACES_API_KEY:
        raise ValueError("GOOGLE_PLACES_API_KEY not set")
    results = []
    params = {"query": f"{query} in {location}", "key": GOOGLE_PLACES_API_KEY}
    while len(results) < count:
        response = httpx.get(PLACES_SEARCH_URL, params=params, timeout=10)
        data = response.json()
        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            raise Exception(f"Places API error: {data.get('status')} - {data.get('error_message','')}")
        results.extend(data.get("results", []))
        next_page_token = data.get("next_page_token")
        if not next_page_token or len(results) >= count:
            break
        time.sleep(2)
        params = {"pagetoken": next_page_token, "key": GOOGLE_PLACES_API_KEY}
    return results[:count]

def fetch_place_details(place_id: str) -> dict:
    params = {
        "place_id": place_id,
        "fields": "name,formatted_phone_number,website,formatted_address,rating,user_ratings_total,business_status",
        "key": GOOGLE_PLACES_API_KEY,
    }
    response = httpx.get(PLACES_DETAIL_URL, params=params, timeout=10)
    data = response.json()
    if data.get("status") == "OK":
        return data.get("result", {})
    return {}

def parse_place_to_lead(place, detail, industry, workspace_id, user_id, source, scoring_rules):
    now = datetime.now(timezone.utc).isoformat()
    address = detail.get("formatted_address") or place.get("formatted_address", "")
    parts = address.split(",")
    city = parts[-3].strip() if len(parts) >= 3 else ""
    state = parts[-2].strip().split(" ")[0] if len(parts) >= 2 else ""
    lead_data = {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "user_id": user_id,
        "business_name": place.get("name", ""),
        "owner_name": None,
        "phone": detail.get("formatted_phone_number"),
        "email": None,
        "website": detail.get("website"),
        "industry": industry,
        "address": address,
        "city": city,
        "state": state,
        "google_rating": place.get("rating"),
        "review_count": place.get("user_ratings_total"),
        "social_profiles": None,
        "estimated_revenue": None,
        "company_size": None,
        "source": source,
        "pipeline_stage": "new",
        "place_id": place.get("place_id"),
        "business_status": place.get("business_status"),
        "created_at": now,
        "updated_at": now,
    }
    lead_data["score"] = calculate_lead_score(lead_data, scoring_rules)
    return lead_data

@shared_task(bind=True, name='tasks.lead_discovery.discover_leads')
def discover_leads(self, workspace_id, location, industry, source="google_maps", count=10):
    db = get_db()
    workspace = db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        return {"status": "error", "message": "Workspace not found"}
    user_id = workspace["user_id"]
    scoring_rules = workspace.get("scoring_rules", {})
    search_term = INDUSTRY_SEARCH_TERMS.get(
        industry.lower().replace(" ", "_").replace("/", "_"), industry
    )
    try:
        places = fetch_places(search_term, location, count)
    except Exception as e:
        db.ai_activities.insert_one({
            "id": str(uuid.uuid4()), "workspace_id": workspace_id,
            "activity_type": "lead_discovery_error", "lead_id": None,
            "description": f"Discovery failed: {str(e)}", "status": "failed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        return {"status": "error", "message": str(e)}

    saved_ids = []
    for i, place in enumerate(places):
        self.update_state(state='PROGRESS', meta={'current': i+1, 'total': len(places)})
        place_id = place.get("place_id")
        if place_id and db.leads.find_one({"place_id": place_id, "workspace_id": workspace_id}):
            continue
        detail = {}
        if place_id:
            try:
                detail = fetch_place_details(place_id)
            except Exception:
                pass
        lead_doc = parse_place_to_lead(place, detail, industry, workspace_id, user_id, source, scoring_rules)
        db.leads.insert_one(lead_doc)
        saved_ids.append(lead_doc["id"])
        db.ai_activities.insert_one({
            "id": str(uuid.uuid4()), "workspace_id": workspace_id,
            "activity_type": "lead_discovered", "lead_id": lead_doc["id"],
            "description": f"Found: {lead_doc['business_name']} in {location}",
            "status": "completed", "timestamp": datetime.now(timezone.utc).isoformat()
        })

    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()), "workspace_id": workspace_id,
        "activity_type": "lead_discovery_batch", "lead_id": None,
        "description": f"Discovered {len(saved_ids)} real {industry} leads in {location}",
        "status": "completed", "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"status": "success", "leads_discovered": len(saved_ids), "lead_ids": saved_ids}

@shared_task(name='tasks.lead_discovery.scheduled_discovery')
def scheduled_discovery():
    db = get_db()
    configs = list(db.discovery_configs.find({"enabled": True}))
    total = 0
    for config in configs:
        workspace = db.workspaces.find_one({"id": config["workspace_id"], "status": "active"})
        if not workspace:
            continue
        for location in config.get("target_locations", [])[:3]:
            for source in config.get("sources", ["google_maps"])[:2]:
                for industry in config.get("target_industries", [workspace.get("industry")])[:1]:
                    batch = min(10, config.get("daily_limit", 100) // max(len(config.get("target_locations", [1])), 1))
                    discover_leads.delay(workspace_id=config["workspace_id"], location=location, industry=industry, source=source, count=batch)
                    total += batch
    return {"status": "success", "workspaces_processed": len(configs), "estimated_leads": total}

@shared_task(name='tasks.lead_discovery.discover_from_source')
def discover_from_source(workspace_id, source, location, industry, count=20):
    db = get_db()
    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()), "workspace_id": workspace_id,
        "activity_type": "source_discovery_started", "lead_id": None,
        "description": f"Starting Google Places discovery in {location} for {industry}",
        "status": "in_progress", "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return discover_leads(workspace_id, location, industry, source, count)
