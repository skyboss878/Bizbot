"""
Lead Discovery Tasks - Autonomous lead finding from multiple sources
"""
import os
import random
import uuid
from datetime import datetime, timezone
from celery import shared_task
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection for tasks
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'automerchant')

def get_db():
    client = MongoClient(mongo_url)
    return client[db_name]

# Industry-specific business name patterns
NAME_PATTERNS = {
    "merchant_services": ["Processing", "Payments", "Financial"],
    "real_estate": ["Realty", "Properties", "Real Estate Group", "Homes"],
    "insurance": ["Insurance Agency", "Insurance Services", "Risk Solutions"],
    "saas_software": ["Tech", "Software", "Solutions", "Digital", "Cloud"],
    "home_services": ["Services", "Pros", "Experts", "Contractors"],
    "professional_services": ["& Associates", "Law Firm", "CPA", "Consulting"],
    "restaurant": ["Grill", "Bistro", "Kitchen", "Cafe", "Diner", "Pizzeria"],
    "retail": ["Shop", "Store", "Boutique", "Market", "Outlet"],
    "medical_dental": ["Medical Center", "Clinic", "Health", "Dental"],
    "automotive": ["Auto", "Motors", "Car Care", "Service Center"],
    "beauty_salon": ["Salon", "Spa", "Beauty", "Studio", "Hair"]
}

PREFIXES = ["Premier", "Elite", "Classic", "Modern", "Golden", "Downtown", "Metro", "Quality", "Best", "Top"]
FIRST_NAMES = ["John", "Mike", "Sarah", "David", "Lisa", "James", "Maria", "Robert", "Jennifer", "Michael"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

SOURCES = ["google_maps", "yelp", "facebook", "linkedin", "instagram", "yellow_pages", "chamber"]


def calculate_lead_score(lead: dict, scoring_rules: dict) -> int:
    """Calculate lead score based on workspace scoring rules"""
    score = scoring_rules.get('base_score', 30)
    
    rating = lead.get('google_rating', 0)
    if rating >= 4.5:
        score += scoring_rules.get('good_rating', 15)
    elif rating >= 4.0:
        score += scoring_rules.get('good_rating', 15) // 2
    
    reviews = lead.get('review_count', 0)
    if reviews >= 50:
        score += scoring_rules.get('50_plus_reviews', 15)
    elif reviews >= 20:
        score += scoring_rules.get('50_plus_reviews', 15) // 2
    
    if lead.get('website'):
        score += scoring_rules.get('website_exists', 10)
    
    if lead.get('social_profiles'):
        score += scoring_rules.get('active_social', 10)
    
    score += scoring_rules.get('high_transaction_industry', 0)
    score += scoring_rules.get('industry_match', 0)
    
    return min(score, 100)


def generate_lead_data(industry: str, location: str, source: str) -> dict:
    """Generate a single lead with realistic data"""
    city, state = location.split(",") if "," in location else (location, "CA")
    city = city.strip()
    state = state.strip()
    
    suffixes = NAME_PATTERNS.get(industry.lower().replace(" ", "_").replace("/", "_"), ["Business", "Company"])
    business_name = f"{random.choice(PREFIXES)} {random.choice(suffixes)}"
    owner_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    
    email_name = owner_name.lower().replace(' ', '.')
    clean_business = business_name.lower().replace(' ', '').replace("'", '').replace("&", "")[:12]
    
    # Industry-specific revenue ranges
    revenue_ranges = {
        "restaurant": (300000, 2000000),
        "real_estate": (100000, 500000),
        "insurance": (200000, 1000000),
        "saas_software": (500000, 5000000),
        "home_services": (150000, 800000),
        "professional_services": (200000, 2000000),
        "retail": (200000, 1500000),
        "medical_dental": (500000, 3000000),
        "automotive": (300000, 1500000),
        "beauty_salon": (100000, 500000)
    }
    rev_range = revenue_ranges.get(industry.lower().replace(" ", "_").replace("/", "_"), (100000, 500000))
    
    return {
        "business_name": business_name,
        "owner_name": owner_name,
        "phone": f"+1{random.randint(200,999)}{random.randint(200,999)}{random.randint(1000,9999)}",
        "email": f"{email_name}@{clean_business}.com",
        "website": f"www.{clean_business}.com",
        "industry": industry,
        "city": city,
        "state": state,
        "google_rating": round(random.uniform(3.5, 5.0), 1),
        "review_count": random.randint(10, 300),
        "estimated_revenue": random.randint(rev_range[0], rev_range[1]),
        "company_size": random.choice(["1-10", "11-50", "51-200", "201-500"]),
        "social_profiles": {
            "facebook": f"facebook.com/{clean_business}",
            "instagram": f"@{clean_business}"
        } if random.random() > 0.3 else None,
        "source": source
    }


@shared_task(bind=True, name='tasks.lead_discovery.discover_leads')
def discover_leads(self, workspace_id: str, location: str, industry: str, source: str = "google_maps", count: int = 10):
    """
    Discover leads for a specific workspace
    This task simulates lead discovery from various sources
    In production, this would integrate with real APIs
    """
    db = get_db()
    
    # Get workspace info
    workspace = db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        return {"status": "error", "message": "Workspace not found"}
    
    user_id = workspace["user_id"]
    scoring_rules = workspace.get("scoring_rules", {})
    
    generated_leads = []
    now = datetime.now(timezone.utc).isoformat()
    
    for i in range(count):
        # Update task progress
        self.update_state(state='PROGRESS', meta={'current': i + 1, 'total': count})
        
        lead_data = generate_lead_data(industry, location, source)
        lead_id = str(uuid.uuid4())
        
        lead_doc = {
            "id": lead_id,
            "workspace_id": workspace_id,
            "user_id": user_id,
            **lead_data,
            "score": calculate_lead_score(lead_data, scoring_rules),
            "pipeline_stage": "new",
            "enrichment_status": "pending",
            "created_at": now,
            "updated_at": now
        }
        
        db.leads.insert_one(lead_doc)
        generated_leads.append(lead_id)
        
        # Log activity
        db.ai_activities.insert_one({
            "id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "activity_type": "lead_discovered",
            "lead_id": lead_id,
            "description": f"Discovered: {lead_data['business_name']} from {source}",
            "status": "completed",
            "timestamp": now
        })
    
    # Log discovery completion
    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "activity_type": "lead_discovery_batch",
        "lead_id": None,
        "description": f"Discovered {count} {industry} leads in {location} from {source}",
        "status": "completed",
        "timestamp": now
    })
    
    return {
        "status": "success",
        "leads_discovered": len(generated_leads),
        "lead_ids": generated_leads
    }


@shared_task(name='tasks.lead_discovery.scheduled_discovery')
def scheduled_discovery():
    """
    Scheduled task to run lead discovery for all active workspaces with discovery enabled
    """
    db = get_db()
    
    # Get all discovery configurations that are enabled
    configs = list(db.discovery_configs.find({"enabled": True}))
    
    total_discovered = 0
    
    for config in configs:
        workspace_id = config["workspace_id"]
        workspace = db.workspaces.find_one({"id": workspace_id, "status": "active"})
        
        if not workspace:
            continue
        
        # Discover leads for each location and source combination
        for location in config.get("target_locations", [])[:3]:  # Limit to 3 locations
            for source in config.get("sources", ["google_maps"])[:2]:  # Limit to 2 sources
                for industry in config.get("target_industries", [workspace.get("industry")])[:1]:
                    # Discover a batch of leads
                    daily_limit = config.get("daily_limit", 100)
                    batch_size = min(10, daily_limit // len(config.get("target_locations", [1])))
                    
                    result = discover_leads.delay(
                        workspace_id=workspace_id,
                        location=location,
                        industry=industry,
                        source=source,
                        count=batch_size
                    )
                    total_discovered += batch_size
    
    return {"status": "success", "workspaces_processed": len(configs), "estimated_leads": total_discovered}


@shared_task(name='tasks.lead_discovery.discover_from_source')
def discover_from_source(workspace_id: str, source: str, location: str, industry: str, count: int = 20):
    """
    Discover leads from a specific source
    In production, this would call the actual API for each source
    """
    db = get_db()
    
    # Log start
    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "activity_type": "source_discovery_started",
        "lead_id": None,
        "description": f"Starting {source} discovery in {location}",
        "status": "in_progress",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Run discovery
    result = discover_leads(workspace_id, location, industry, source, count)
    
    return result
