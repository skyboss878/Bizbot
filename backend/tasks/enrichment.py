"""
Lead Enrichment Tasks - Enrich leads with additional data
"""
import os
import uuid
import httpx
from datetime import datetime, timezone
from celery import shared_task
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'automerchant')
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')

def get_db():
    import certifi
    client = MongoClient(MONGO_URL, tlsCAFile=certifi.where())
    return client[DB_NAME]

@shared_task(name='tasks.enrichment.enrich_pending_leads')
def enrich_pending_leads():
    """Enrich leads that have a place_id but missing phone/website"""
    db = get_db()
    leads = list(db.leads.find({
        "place_id": {"$exists": True, "$ne": None},
        "$or": [{"phone": None}, {"website": None}],
        "enrichment_status": {"$ne": "completed"}
    }).limit(20))

    enriched = 0
    for lead in leads:
        try:
            place_id = lead.get("place_id")
            if not place_id or not GOOGLE_PLACES_API_KEY:
                continue

            r = httpx.get(
                "https://maps.googleapis.com/maps/api/place/details/json",
                params={
                    "place_id": place_id,
                    "fields": "formatted_phone_number,website,opening_hours,business_status",
                    "key": GOOGLE_PLACES_API_KEY
                },
                timeout=10
            )
            detail = r.json().get("result", {})

            update = {"enrichment_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}
            if detail.get("formatted_phone_number") and not lead.get("phone"):
                update["phone"] = detail["formatted_phone_number"]
            if detail.get("website") and not lead.get("website"):
                update["website"] = detail["website"]
            if detail.get("business_status"):
                update["business_status"] = detail["business_status"]

            db.leads.update_one({"id": lead["id"]}, {"$set": update})
            enriched += 1

        except Exception as e:
            db.leads.update_one({"id": lead["id"]}, {"$set": {"enrichment_status": "failed"}})

    return {"status": "success", "enriched": enriched}
