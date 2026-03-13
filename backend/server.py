import dns.resolver
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ["8.8.8.8", "8.8.4.4"]
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import dns.resolver
import dns.rdatatype
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ["8.8.8.8","8.8.4.4"]
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import PyPDF2
import io
import re
import json
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
import certifi
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'automerchant-ai-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="AutoMerchant AI API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== INDUSTRY TEMPLATES ====================

INDUSTRY_TEMPLATES = {
    "merchant_services": {
        "name": "Merchant Services",
        "description": "Payment processing and cash discount programs",
        "category": "B2B",
        "scoring_rules": {
            "high_transaction_industry": 25,
            "50_plus_reviews": 15,
            "website_exists": 10,
            "4_plus_rating": 10,
            "active_social": 10,
            "base_score": 30
        },
        "outreach_templates": {
            "sms_initial": "Hey {{owner_name}}, quick question — are you currently paying credit card processing fees at your {{industry}}? I work with a program that eliminates those fees entirely.",
            "sms_followup": "Hi {{owner_name}}, just following up. Many {{industry}} owners I talk to are saving $1,000-$3,000/month with our zero-fee program. Worth a quick chat?",
            "email_initial": "Subject: Eliminate your processing fees\n\nHi {{owner_name}},\n\nI noticed {{business_name}} has great reviews. Many businesses like yours pay 2-4% in credit card fees.\n\nOur cash discount program lets customers cover that cost, saving you thousands annually.\n\nWould you like a free statement analysis?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a merchant services sales agent. Qualify this lead based on their processing volume, current rates, and pain points with their current processor.",
            "objection_handling": "Common objections: 'I'm locked in a contract', 'My rates are already low', 'I don't want to charge customers extra'. Address these professionally.",
            "closing": "Guide the merchant to upload their statement for analysis or book a demo call."
        },
        "follow_up_schedule": [1, 2, 4, 7, 14]
    },
    "real_estate": {
        "name": "Real Estate",
        "description": "Property listings and buyer/seller leads",
        "category": "B2B/B2C",
        "scoring_rules": {
            "active_listings": 25,
            "verified_agent": 20,
            "response_history": 15,
            "market_activity": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I came across {{business_name}} and wanted to reach out. Are you looking for qualified buyer leads in {{city}}?",
            "sms_followup": "{{owner_name}}, just checking in. We've helped agents in {{city}} close 3-5 more deals per month with our lead gen system.",
            "email_initial": "Subject: More qualified leads for {{business_name}}\n\nHi {{owner_name}},\n\nI help real estate agents get pre-qualified buyer and seller leads.\n\nWould you be interested in learning how we can help {{business_name}} grow?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a real estate marketing specialist. Qualify agents based on their market, transaction volume, and marketing budget.",
            "objection_handling": "Common objections: 'I get enough referrals', 'Leads are too expensive', 'Bad lead quality'. Address with case studies.",
            "closing": "Offer a free market analysis or trial leads package."
        },
        "follow_up_schedule": [1, 3, 5, 10]
    },
    "insurance": {
        "name": "Insurance",
        "description": "Insurance products and policy sales",
        "category": "B2B/B2C",
        "scoring_rules": {
            "business_owner": 25,
            "fleet_vehicles": 20,
            "employees_count": 15,
            "property_value": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I specialize in helping business owners like you save on commercial insurance. When was the last time you compared rates?",
            "sms_followup": "{{owner_name}}, quick follow up - most businesses I work with save 20-30% on their premiums. Worth a 5-min quote?",
            "email_initial": "Subject: Save on your business insurance\n\nHi {{owner_name}},\n\nI help business owners get better coverage at lower rates.\n\nWould you like a free quote comparison?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are an insurance agent. Qualify based on current coverage, renewal date, and pain points.",
            "objection_handling": "Handle: 'Happy with current agent', 'Just renewed', 'Too busy to switch'.",
            "closing": "Offer free quote or coverage review."
        },
        "follow_up_schedule": [1, 3, 7, 14, 30]
    },
    "saas_software": {
        "name": "SaaS / Software",
        "description": "Software and technology solutions",
        "category": "B2B",
        "scoring_rules": {
            "company_size": 25,
            "tech_stack_fit": 20,
            "growth_signals": 15,
            "funding_status": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I noticed {{business_name}} is growing fast. Are you looking to streamline your {{pain_point}}?",
            "sms_followup": "{{owner_name}}, companies like {{business_name}} typically see 40% efficiency gains with our solution. Quick demo?",
            "email_initial": "Subject: Helping {{business_name}} scale faster\n\nHi {{owner_name}},\n\nI work with growing companies to solve {{pain_point}}.\n\nWould you be open to a brief call to see if we're a fit?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a SaaS sales rep. Qualify based on company size, budget, timeline, and decision-making process.",
            "objection_handling": "Handle: 'Using competitor', 'No budget', 'Not priority right now'.",
            "closing": "Offer demo, free trial, or case study."
        },
        "follow_up_schedule": [1, 3, 5, 7, 14]
    },
    "home_services": {
        "name": "Home Services",
        "description": "HVAC, plumbing, roofing, landscaping",
        "category": "B2B",
        "scoring_rules": {
            "service_area_match": 25,
            "reviews_quality": 20,
            "response_time": 15,
            "service_variety": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I help home service companies like {{business_name}} get more jobs in {{city}}. Interested in more leads?",
            "sms_followup": "{{owner_name}}, contractors I work with are booking 10-15 extra jobs per month. Quick call to show you how?",
            "email_initial": "Subject: More jobs for {{business_name}}\n\nHi {{owner_name}},\n\nI help home service companies get consistent leads.\n\nWould you like to see how we can help {{business_name}} grow?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a home services marketing specialist. Qualify based on service area, current marketing, and capacity.",
            "objection_handling": "Handle: 'Too busy already', 'Bad lead experiences', 'Just use referrals'.",
            "closing": "Offer free marketing audit or trial campaign."
        },
        "follow_up_schedule": [1, 2, 5, 10]
    },
    "professional_services": {
        "name": "Professional Services",
        "description": "Lawyers, accountants, consultants",
        "category": "B2B",
        "scoring_rules": {
            "practice_size": 25,
            "specialization": 20,
            "client_base": 15,
            "online_presence": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I help {{industry}} firms get more qualified clients. Is {{business_name}} looking to grow?",
            "sms_followup": "{{owner_name}}, firms I work with typically see 30% more consultations. Worth exploring?",
            "email_initial": "Subject: Client growth for {{business_name}}\n\nHi {{owner_name}},\n\nI specialize in helping {{industry}} firms attract ideal clients.\n\nWould you be interested in a brief call?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a professional services marketing consultant. Qualify based on practice area, firm size, and growth goals.",
            "objection_handling": "Handle: 'Reputation-based business', 'Ethical concerns about marketing', 'Limited budget'.",
            "closing": "Offer case study or marketing strategy session."
        },
        "follow_up_schedule": [2, 5, 10, 20]
    },
    "restaurant": {
        "name": "Restaurant",
        "description": "Restaurants, cafes, bars, food service",
        "category": "B2B",
        "scoring_rules": {
            "high_volume": 25,
            "good_rating": 20,
            "many_reviews": 15,
            "online_ordering": 10,
            "base_score": 30
        },
        "outreach_templates": {
            "sms_initial": "Hey {{owner_name}}, quick question — are you currently paying credit card processing fees at {{business_name}}? I work with a program that eliminates those fees entirely.",
            "sms_followup": "Hi {{owner_name}}, restaurants I work with save $1,500-$3,000/month with zero-fee processing. Worth a 5-min call?",
            "email_initial": "Subject: Stop paying processing fees at {{business_name}}\n\nHi {{owner_name}},\n\nI help restaurants eliminate credit card processing fees entirely.\n\nMost restaurants save $15,000-$35,000 per year.\n\nWant a free analysis?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a restaurant services specialist. Qualify based on monthly volume, current processor, and pain points.",
            "objection_handling": "Handle: 'Customers won't like fees', 'Locked in contract', 'Happy with Square/Toast'.",
            "closing": "Request statement upload or demo."
        },
        "follow_up_schedule": [1, 2, 4, 7]
    },
    "retail": {
        "name": "Retail",
        "description": "Retail stores and shops",
        "category": "B2B",
        "scoring_rules": {
            "store_type": 25,
            "foot_traffic": 20,
            "pos_system": 15,
            "online_presence": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I help retail stores like {{business_name}} reduce payment processing costs. Interested in saving money?",
            "sms_followup": "{{owner_name}}, retail stores I work with save 2-3% on every transaction. Quick call?",
            "email_initial": "Subject: Reduce costs at {{business_name}}\n\nHi {{owner_name}},\n\nI help retail stores optimize their payment processing.\n\nWould you like a free cost analysis?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a retail solutions specialist. Qualify based on transaction volume, current system, and pain points.",
            "objection_handling": "Handle: 'Just switched systems', 'Too small', 'Integrated with inventory'.",
            "closing": "Offer savings analysis or demo."
        },
        "follow_up_schedule": [1, 3, 7, 14]
    },
    "medical_dental": {
        "name": "Medical / Dental",
        "description": "Medical offices, dental practices, clinics",
        "category": "B2B",
        "scoring_rules": {
            "practice_size": 25,
            "patient_volume": 20,
            "specialization": 15,
            "insurance_accepted": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I help medical practices like {{business_name}} streamline patient acquisition. Looking to grow?",
            "sms_followup": "{{owner_name}}, practices I work with see 25% more new patients monthly. Worth a quick call?",
            "email_initial": "Subject: Grow {{business_name}}'s patient base\n\nHi {{owner_name}},\n\nI specialize in helping medical practices attract new patients.\n\nWould you be interested in learning more?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a healthcare marketing specialist. Qualify based on practice size, specialization, and growth goals.",
            "objection_handling": "Handle: 'HIPAA concerns', 'Patient referrals only', 'Insurance limitations'.",
            "closing": "Offer compliance-friendly marketing audit."
        },
        "follow_up_schedule": [2, 5, 10, 21]
    },
    "automotive": {
        "name": "Auto Repair & Dealerships",
        "description": "Auto repair shops, car dealerships, service centers",
        "category": "B2B",
        "scoring_rules": {
            "service_volume": 25,
            "reviews": 20,
            "certifications": 15,
            "fleet_accounts": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I help auto shops like {{business_name}} get more customers and reduce costs. Interested?",
            "sms_followup": "{{owner_name}}, auto shops I work with save thousands on processing and get more bookings. Quick call?",
            "email_initial": "Subject: Grow {{business_name}}\n\nHi {{owner_name}},\n\nI help automotive businesses reduce costs and get more customers.\n\nWould you like to learn more?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are an automotive business consultant. Qualify based on service volume, current marketing, and pain points.",
            "objection_handling": "Handle: 'Loyal customer base', 'Shop management software locked in', 'Busy season'.",
            "closing": "Offer free business analysis."
        },
        "follow_up_schedule": [1, 3, 7, 14]
    },
    "beauty_salon": {
        "name": "Beauty & Salons",
        "description": "Hair salons, spas, nail salons, barbershops",
        "category": "B2B",
        "scoring_rules": {
            "booking_volume": 25,
            "reviews": 20,
            "social_presence": 15,
            "staff_size": 15,
            "base_score": 25
        },
        "outreach_templates": {
            "sms_initial": "Hi {{owner_name}}, I help salons like {{business_name}} fill more appointments and reduce fees. Interested?",
            "sms_followup": "{{owner_name}}, salons I work with save $500-$1,500/month and book more clients. Quick chat?",
            "email_initial": "Subject: More bookings for {{business_name}}\n\nHi {{owner_name}},\n\nI help beauty businesses grow their client base and reduce costs.\n\nWould you like to learn more?\n\nBest regards"
        },
        "ai_prompts": {
            "qualification": "You are a beauty industry consultant. Qualify based on booking volume, staff size, and growth goals.",
            "objection_handling": "Handle: 'Using booking software', 'Loyal clientele', 'Small operation'.",
            "closing": "Offer free marketing or savings audit."
        },
        "follow_up_schedule": [1, 2, 5, 10]
    }
}

LEAD_SOURCES = {
    "google_maps": {"name": "Google Maps", "icon": "map", "active": True},
    "yelp": {"name": "Yelp", "icon": "star", "active": True},
    "facebook": {"name": "Facebook Business", "icon": "facebook", "active": True},
    "yellow_pages": {"name": "Yellow Pages", "icon": "book", "active": True},
    "linkedin": {"name": "LinkedIn", "icon": "linkedin", "active": True},
    "instagram": {"name": "Instagram Business", "icon": "instagram", "active": True},
    "chamber": {"name": "Chamber of Commerce", "icon": "building", "active": True}
}

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    company: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    company: Optional[str] = None
    role: str = "user"
    subscription_tier: str = "starter"
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Workspace Models
class WorkspaceCreate(BaseModel):
    name: str
    industry: str
    description: Optional[str] = None
    target_locations: List[str] = []
    lead_sources: List[str] = []
    custom_scoring_rules: Optional[Dict[str, int]] = None
    custom_templates: Optional[Dict[str, str]] = None
    ai_prompts: Optional[Dict[str, str]] = None

class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    industry: str
    description: Optional[str] = None
    target_locations: List[str] = []
    lead_sources: List[str] = []
    scoring_rules: Dict[str, int] = {}
    templates: Dict[str, str] = {}
    ai_prompts: Dict[str, str] = {}
    lead_count: int = 0
    active_campaigns: int = 0
    status: str = "active"
    created_at: str

class LeadCreate(BaseModel):
    workspace_id: str
    business_name: str
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    google_rating: Optional[float] = None
    review_count: Optional[int] = None
    social_profiles: Optional[Dict[str, str]] = None
    estimated_revenue: Optional[float] = None
    company_size: Optional[str] = None
    source: str = "manual"

class LeadUpdate(BaseModel):
    business_name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    google_rating: Optional[float] = None
    review_count: Optional[int] = None
    pipeline_stage: Optional[str] = None
    score: Optional[int] = None
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workspace_id: str
    business_name: str
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    industry: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    google_rating: Optional[float] = None
    review_count: Optional[int] = None
    social_profiles: Optional[Dict[str, str]] = None
    estimated_revenue: Optional[float] = None
    company_size: Optional[str] = None
    score: int = 0
    pipeline_stage: str = "new"
    source: str = "manual"
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class ConversationCreate(BaseModel):
    workspace_id: str
    lead_id: str
    channel: str
    direction: str
    content: str
    ai_generated: bool = False

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workspace_id: str
    lead_id: str
    channel: str
    direction: str
    content: str
    ai_generated: bool
    timestamp: str

class CampaignCreate(BaseModel):
    workspace_id: str
    name: str
    campaign_type: str
    target_industries: List[str]
    target_locations: List[str] = []
    message_template: str
    follow_up_enabled: bool = True
    follow_up_schedule: List[int] = [1, 3, 7]
    ai_agent_enabled: bool = True
    status: str = "draft"

class CampaignResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workspace_id: str
    name: str
    campaign_type: str
    target_industries: List[str]
    target_locations: List[str] = []
    message_template: str
    follow_up_enabled: bool
    follow_up_schedule: List[int] = []
    ai_agent_enabled: bool
    status: str
    leads_contacted: int = 0
    responses: int = 0
    appointments_booked: int = 0
    deals_closed: int = 0
    created_at: str

class LeadDiscoveryConfig(BaseModel):
    workspace_id: str
    sources: List[str]
    target_locations: List[str]
    target_industries: List[str]
    min_rating: float = 3.5
    min_reviews: int = 10
    auto_enrich: bool = True
    auto_score: bool = True
    auto_outreach: bool = False
    daily_limit: int = 100
    enabled: bool = True

class StatementAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workspace_id: str
    lead_id: str
    filename: str
    processor_name: Optional[str] = None
    monthly_volume: Optional[float] = None
    effective_rate: Optional[float] = None
    fees_paid: Optional[float] = None
    hidden_fees: Optional[float] = None
    interchange_cost: Optional[float] = None
    potential_savings: Optional[float] = None
    analysis_status: str = "pending"
    raw_text: Optional[str] = None
    created_at: str

class DashboardStats(BaseModel):
    total_leads: int
    leads_today: int
    messages_sent: int
    responses: int
    statements_analyzed: int
    appointments_booked: int
    deals_closed: int
    monthly_residual: float
    pipeline_stats: Dict[str, int]
    source_stats: Dict[str, int]

class AIActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    workspace_id: Optional[str] = None
    activity_type: str
    lead_id: Optional[str] = None
    description: str
    status: str
    timestamp: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== SCORING HELPERS ====================

def calculate_lead_score(lead: dict, scoring_rules: dict) -> int:
    """Calculate lead score based on workspace scoring rules"""
    score = scoring_rules.get('base_score', 30)
    
    # Rating score
    rating = lead.get('google_rating', 0)
    if rating >= 4.5:
        score += scoring_rules.get('good_rating', 15)
    elif rating >= 4.0:
        score += scoring_rules.get('good_rating', 15) // 2
    
    # Review count score
    reviews = lead.get('review_count', 0)
    if reviews >= 50:
        score += scoring_rules.get('50_plus_reviews', 15)
    elif reviews >= 20:
        score += scoring_rules.get('50_plus_reviews', 15) // 2
    
    # Website exists
    if lead.get('website'):
        score += scoring_rules.get('website_exists', 10)
    
    # Social profiles
    if lead.get('social_profiles'):
        score += scoring_rules.get('active_social', 10)
    
    # Industry match bonus
    score += scoring_rules.get('high_transaction_industry', 0)
    score += scoring_rules.get('industry_match', 0)
    
    return min(score, 100)

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "company": user_data.company,
        "role": "user",
        "subscription_tier": "starter",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        company=user_data.company,
        role="user",
        subscription_tier="starter",
        created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        company=user.get("company"),
        role=user.get("role", "user"),
        subscription_tier=user.get("subscription_tier", "starter"),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        company=current_user.get("company"),
        role=current_user.get("role", "user"),
        subscription_tier=current_user.get("subscription_tier", "starter"),
        created_at=current_user["created_at"]
    )

# ==================== INDUSTRY TEMPLATES ROUTES ====================

@api_router.get("/industries")
async def get_industries():
    """Get all available industry templates"""
    return {
        "industries": INDUSTRY_TEMPLATES,
        "sources": LEAD_SOURCES
    }

@api_router.get("/industries/{industry_key}")
async def get_industry(industry_key: str):
    """Get specific industry template"""
    if industry_key not in INDUSTRY_TEMPLATES:
        raise HTTPException(status_code=404, detail="Industry not found")
    return INDUSTRY_TEMPLATES[industry_key]

# ==================== WORKSPACE ROUTES ====================

@api_router.post("/workspaces", response_model=WorkspaceResponse)
async def create_workspace(workspace_data: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    workspace_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Get industry template
    industry_template = INDUSTRY_TEMPLATES.get(workspace_data.industry, {})
    
    # Merge custom rules with industry defaults
    scoring_rules = industry_template.get("scoring_rules", {}).copy()
    if workspace_data.custom_scoring_rules:
        scoring_rules.update(workspace_data.custom_scoring_rules)
    
    templates = industry_template.get("outreach_templates", {}).copy()
    if workspace_data.custom_templates:
        templates.update(workspace_data.custom_templates)
    
    ai_prompts = industry_template.get("ai_prompts", {}).copy()
    if workspace_data.ai_prompts:
        ai_prompts.update(workspace_data.ai_prompts)
    
    workspace_doc = {
        "id": workspace_id,
        "user_id": current_user["id"],
        "name": workspace_data.name,
        "industry": workspace_data.industry,
        "description": workspace_data.description,
        "target_locations": workspace_data.target_locations,
        "lead_sources": workspace_data.lead_sources or list(LEAD_SOURCES.keys()),
        "scoring_rules": scoring_rules,
        "templates": templates,
        "ai_prompts": ai_prompts,
        "follow_up_schedule": industry_template.get("follow_up_schedule", [1, 3, 7]),
        "lead_count": 0,
        "active_campaigns": 0,
        "status": "active",
        "created_at": now,
        "updated_at": now
    }
    
    await db.workspaces.insert_one(workspace_doc)
    await log_ai_activity(workspace_id, "workspace_created", None, f"Created workspace: {workspace_data.name}", "completed")
    
    return WorkspaceResponse(**workspace_doc)

@api_router.get("/workspaces", response_model=List[WorkspaceResponse])
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    workspaces = await db.workspaces.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Update lead counts
    for ws in workspaces:
        lead_count = await db.leads.count_documents({"workspace_id": ws["id"]})
        ws["lead_count"] = lead_count
        campaign_count = await db.campaigns.count_documents({"workspace_id": ws["id"], "status": "active"})
        ws["active_campaigns"] = campaign_count
    
    return [WorkspaceResponse(**ws) for ws in workspaces]

@api_router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    workspace = await db.workspaces.find_one(
        {"id": workspace_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    workspace["lead_count"] = await db.leads.count_documents({"workspace_id": workspace_id})
    workspace["active_campaigns"] = await db.campaigns.count_documents({"workspace_id": workspace_id, "status": "active"})
    
    return WorkspaceResponse(**workspace)

@api_router.patch("/workspaces/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    target_locations: Optional[List[str]] = None,
    lead_sources: Optional[List[str]] = None,
    custom_scoring_rules: Optional[Dict[str, int]] = None,
    custom_templates: Optional[Dict[str, str]] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    if name: update_data["name"] = name
    if description: update_data["description"] = description
    if target_locations: update_data["target_locations"] = target_locations
    if lead_sources: update_data["lead_sources"] = lead_sources
    if status: update_data["status"] = status
    
    if custom_scoring_rules:
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if workspace:
            merged_rules = workspace.get("scoring_rules", {})
            merged_rules.update(custom_scoring_rules)
            update_data["scoring_rules"] = merged_rules
    
    if custom_templates:
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if workspace:
            merged_templates = workspace.get("templates", {})
            merged_templates.update(custom_templates)
            update_data["templates"] = merged_templates
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.workspaces.update_one(
            {"id": workspace_id, "user_id": current_user["id"]},
            {"$set": update_data}
        )
    
    return {"message": "Workspace updated"}

@api_router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.workspaces.delete_one({"id": workspace_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Delete associated data
    await db.leads.delete_many({"workspace_id": workspace_id})
    await db.conversations.delete_many({"workspace_id": workspace_id})
    await db.campaigns.delete_many({"workspace_id": workspace_id})
    await db.statements.delete_many({"workspace_id": workspace_id})
    
    return {"message": "Workspace deleted"}

# ==================== LEADS ROUTES ====================

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    # Verify workspace exists
    workspace = await db.workspaces.find_one(
        {"id": lead_data.workspace_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    lead_dict = lead_data.model_dump()
    lead_dict["id"] = lead_id
    lead_dict["user_id"] = current_user["id"]
    lead_dict["score"] = calculate_lead_score(lead_dict, workspace.get("scoring_rules", {}))
    lead_dict["pipeline_stage"] = "new"
    lead_dict["created_at"] = now
    lead_dict["updated_at"] = now
    
    await db.leads.insert_one(lead_dict)
    await log_ai_activity(lead_data.workspace_id, "lead_created", lead_id, f"New lead: {lead_data.business_name}", "completed")
    
    return LeadResponse(**lead_dict)

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    workspace_id: Optional[str] = None,
    pipeline_stage: Optional[str] = None,
    industry: Optional[str] = None,
    min_score: Optional[int] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if workspace_id:
        query["workspace_id"] = workspace_id
    if pipeline_stage:
        query["pipeline_stage"] = pipeline_stage
    if industry:
        query["industry"] = {"$regex": industry, "$options": "i"}
    if min_score:
        query["score"] = {"$gte": min_score}
    if source:
        query["source"] = source
    if search:
        query["$or"] = [
            {"business_name": {"$regex": search, "$options": "i"}},
            {"owner_name": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [LeadResponse(**lead) for lead in leads]

@api_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "user_id": current_user["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse(**lead)

@api_router.patch("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, lead_update: LeadUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in lead_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.update_one(
        {"id": lead_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return LeadResponse(**lead)

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}

# ==================== LEAD DISCOVERY ENGINE ====================

INDUSTRY_SEARCH_TERMS = {
    "merchant_services": "retail business",
    "real_estate": "real estate agency",
    "insurance": "insurance agency",
    "saas_software": "software company",
    "home_services": "home services contractor",
    "professional_services": "law firm consulting accounting",
    "restaurant": "restaurant",
    "retail": "retail store",
    "medical_dental": "medical clinic dental office",
    "automotive": "auto repair shop",
    "auto_repair": "auto repair shop",
    "beauty_salon": "beauty salon",
    "barbershop": "barbershop",
    "nail_salon": "nail salon",
    "hair_salon": "hair salon",
    "spa": "day spa",
    "car_wash": "car wash",
    "smoke_shop": "smoke shop tobacco",
    "liquor_store": "liquor store",
    "convenience_store": "convenience store",
    "other": "local business",
}

def fetch_places_sync(query: str, location: str, count: int = 20) -> list:
    import httpx, time
    key = os.environ.get("GOOGLE_PLACES_API_KEY", "")
    if not key:
        raise ValueError("GOOGLE_PLACES_API_KEY not set")
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    detail_url = "https://maps.googleapis.com/maps/api/place/details/json"
    results = []
    params = {"query": f"{query} in {location}", "key": key}
    while len(results) < count:
        r = httpx.get(url, params=params, timeout=10)
        data = r.json()
        if data.get("status") not in ("OK", "ZERO_RESULTS"):
            raise Exception(f"Places API: {data.get('status')} - {data.get('error_message','')}")
        for place in data.get("results", []):
            pid = place.get("place_id")
            detail = {}
            if pid:
                try:
                    dr = httpx.get(detail_url, params={"place_id": pid, "fields": "name,formatted_phone_number,website,formatted_address,rating,user_ratings_total,business_status", "key": key}, timeout=10)
                    detail = dr.json().get("result", {})
                except: pass
            place["_detail"] = detail
            results.append(place)
        token = data.get("next_page_token")
        if not token or len(results) >= count:
            break
        time.sleep(2)
        params = {"pagetoken": token, "key": key}
    return results[:count]

@api_router.post("/discovery/generate")
async def generate_leads(
    workspace_id: str,
    location: str,
    industry: str,
    source: str = "google_maps",
    count: int = Query(default=10, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Discover REAL leads from Google Places API"""
    workspace = await db.workspaces.find_one(
        {"id": workspace_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    search_term = INDUSTRY_SEARCH_TERMS.get(industry.lower().replace(" ","_").replace("/","_"), industry)
    import asyncio
    loop = asyncio.get_event_loop()
    try:
        places = await loop.run_in_executor(None, fetch_places_sync, search_term, location, count)
    except Exception as e:
        import traceback
        logger.error(f"Places error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Google Places error: {str(e)}")
    now = datetime.now(timezone.utc).isoformat()
    saved = []
    for place in places:
        detail = place.get("_detail", {})
        addr = detail.get("formatted_address") or place.get("formatted_address","")
        parts = addr.split(",")
        city_val = parts[-3].strip() if len(parts)>=3 else location.split(",")[0].strip()
        state_val = parts[-2].strip().split(" ")[0] if len(parts)>=2 else "CA"
        lead_id = str(uuid.uuid4())
        lead_doc = {
            "id": lead_id, "workspace_id": workspace_id, "user_id": current_user["id"],
            "business_name": place.get("name",""), "owner_name": None,
            "phone": detail.get("formatted_phone_number"), "email": None,
            "website": detail.get("website"), "industry": industry,
            "address": addr, "city": city_val, "state": state_val,
            "google_rating": place.get("rating"), "review_count": place.get("user_ratings_total"),
            "social_profiles": None, "estimated_revenue": None, "company_size": None,
            "source": source, "pipeline_stage": "new", "place_id": place.get("place_id"),
            "score": 0, "created_at": now, "updated_at": now
        }
        lead_doc["score"] = calculate_lead_score(lead_doc, workspace.get("scoring_rules",{}))
        await db.leads.insert_one(lead_doc)
        saved.append(LeadResponse(**lead_doc))
    await log_ai_activity(workspace_id,"lead_discovery",None,f"Discovered {len(saved)} real {industry} leads in {location}","completed")
    return {"message": f"Discovered {len(saved)} real leads", "leads": saved}

@api_router.post("/discovery/configure")
async def configure_discovery(config: LeadDiscoveryConfig, current_user: dict = Depends(get_current_user)):
    """Configure lead discovery settings for a workspace"""
    # Verify workspace
    workspace = await db.workspaces.find_one(
        {"id": config.workspace_id, "user_id": current_user["id"]}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    config_id = str(uuid.uuid4())
    config_doc = config.model_dump()
    config_doc["id"] = config_id
    config_doc["user_id"] = current_user["id"]
    config_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Upsert configuration
    await db.discovery_configs.update_one(
        {"workspace_id": config.workspace_id, "user_id": current_user["id"]},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"message": "Discovery configuration saved", "config": config_doc}

@api_router.get("/discovery/config/{workspace_id}")
async def get_discovery_config(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Get lead discovery configuration"""
    config = await db.discovery_configs.find_one(
        {"workspace_id": workspace_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not config:
        return {"enabled": False, "sources": [], "target_locations": [], "target_industries": []}
    return config

# ==================== CONVERSATIONS ROUTES ====================

@api_router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(conv_data: ConversationCreate, current_user: dict = Depends(get_current_user)):
    # Verify lead exists and belongs to user
    lead = await db.leads.find_one({"id": conv_data.lead_id, "user_id": current_user["id"]})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    conv_id = str(uuid.uuid4())
    conv_dict = conv_data.model_dump()
    conv_dict["id"] = conv_id
    conv_dict["user_id"] = current_user["id"]
    conv_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    await db.conversations.insert_one(conv_dict)
    
    # Update lead pipeline if first contact
    if lead["pipeline_stage"] == "new":
        await db.leads.update_one(
            {"id": conv_data.lead_id},
            {"$set": {"pipeline_stage": "contacted", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return ConversationResponse(**conv_dict)

@api_router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    workspace_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    channel: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if workspace_id:
        query["workspace_id"] = workspace_id
    if lead_id:
        query["lead_id"] = lead_id
    if channel:
        query["channel"] = channel
    
    convs = await db.conversations.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [ConversationResponse(**conv) for conv in convs]

@api_router.get("/leads/{lead_id}/conversations", response_model=List[ConversationResponse])
async def get_lead_conversations(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "user_id": current_user["id"]})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    convs = await db.conversations.find(
        {"lead_id": lead_id, "user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    return [ConversationResponse(**conv) for conv in convs]

# ==================== STATEMENT ANALYSIS ROUTES ====================

def extract_statement_data(text: str) -> dict:
    """Extract key data from merchant statement text using regex patterns"""
    data = {}
    
    volume_patterns = [
        r'total\s*(?:sales|volume)[:\s]*\$?([\d,]+\.?\d*)',
        r'monthly\s*(?:sales|volume)[:\s]*\$?([\d,]+\.?\d*)',
        r'gross\s*(?:sales|volume)[:\s]*\$?([\d,]+\.?\d*)',
    ]
    for pattern in volume_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['monthly_volume'] = float(match.group(1).replace(',', ''))
            break
    
    rate_patterns = [
        r'effective\s*rate[:\s]*([\d.]+)%',
        r'discount\s*rate[:\s]*([\d.]+)%',
        r'total\s*rate[:\s]*([\d.]+)%',
    ]
    for pattern in rate_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['effective_rate'] = float(match.group(1))
            break
    
    fee_patterns = [
        r'total\s*(?:fees|charges)[:\s]*\$?([\d,]+\.?\d*)',
        r'fees\s*(?:paid|charged)[:\s]*\$?([\d,]+\.?\d*)',
    ]
    for pattern in fee_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['fees_paid'] = float(match.group(1).replace(',', ''))
            break
    
    processor_patterns = [
        r'processor[:\s]*([A-Za-z\s]+)',
        r'merchant\s*services[:\s]*([A-Za-z\s]+)',
    ]
    for pattern in processor_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['processor_name'] = match.group(1).strip()[:50]
            break
    
    return data

@api_router.post("/statements/upload")
async def upload_statement(
    workspace_id: str,
    lead_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    lead = await db.leads.find_one({"id": lead_id, "user_id": current_user["id"]})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    content = await file.read()
    text = ""
    
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise HTTPException(status_code=400, detail="Failed to read PDF file")
    
    extracted_data = extract_statement_data(text)
    
    potential_savings = 0
    if extracted_data.get('fees_paid'):
        potential_savings = extracted_data['fees_paid'] * 12
    elif extracted_data.get('monthly_volume') and extracted_data.get('effective_rate'):
        monthly_fees = extracted_data['monthly_volume'] * (extracted_data['effective_rate'] / 100)
        potential_savings = monthly_fees * 12
        extracted_data['fees_paid'] = monthly_fees
    
    statement_id = str(uuid.uuid4())
    statement_doc = {
        "id": statement_id,
        "workspace_id": workspace_id,
        "lead_id": lead_id,
        "user_id": current_user["id"],
        "filename": file.filename,
        "processor_name": extracted_data.get('processor_name'),
        "monthly_volume": extracted_data.get('monthly_volume'),
        "effective_rate": extracted_data.get('effective_rate'),
        "fees_paid": extracted_data.get('fees_paid'),
        "hidden_fees": extracted_data.get('hidden_fees'),
        "interchange_cost": extracted_data.get('interchange_cost'),
        "potential_savings": potential_savings,
        "analysis_status": "completed",
        "raw_text": text[:5000],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.statements.insert_one(statement_doc)
    
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"pipeline_stage": "statement_received", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_ai_activity(workspace_id, "statement_analyzed", lead_id, f"Statement analyzed: {file.filename}", "completed")
    
    return StatementAnalysis(**statement_doc)

@api_router.get("/statements", response_model=List[StatementAnalysis])
async def get_statements(
    workspace_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if workspace_id:
        query["workspace_id"] = workspace_id
    if lead_id:
        query["lead_id"] = lead_id
    
    statements = await db.statements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [StatementAnalysis(**s) for s in statements]

# ==================== CAMPAIGNS ROUTES ====================

@api_router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(campaign_data: CampaignCreate, current_user: dict = Depends(get_current_user)):
    # Verify workspace
    workspace = await db.workspaces.find_one(
        {"id": campaign_data.workspace_id, "user_id": current_user["id"]}
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    campaign_id = str(uuid.uuid4())
    campaign_dict = campaign_data.model_dump()
    campaign_dict["id"] = campaign_id
    campaign_dict["user_id"] = current_user["id"]
    campaign_dict["leads_contacted"] = 0
    campaign_dict["responses"] = 0
    campaign_dict["appointments_booked"] = 0
    campaign_dict["deals_closed"] = 0
    campaign_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.campaigns.insert_one(campaign_dict)
    
    await log_ai_activity(
        campaign_data.workspace_id,
        "campaign_created",
        None,
        f"Campaign created: {campaign_data.name}",
        "completed"
    )
    
    return CampaignResponse(**campaign_dict)

@api_router.get("/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(
    workspace_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if workspace_id:
        query["workspace_id"] = workspace_id
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [CampaignResponse(**c) for c in campaigns]

@api_router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    update_data = {}
    if status:
        update_data["status"] = status
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.campaigns.update_one(
        {"id": campaign_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign updated"}

# ==================== DASHBOARD & ANALYTICS ====================

async def log_ai_activity(workspace_id: Optional[str], activity_type: str, lead_id: Optional[str], description: str, status: str):
    """Log AI agent activity"""
    activity = {
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "activity_type": activity_type,
        "lead_id": lead_id,
        "description": description,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.ai_activities.insert_one(activity)

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    workspace_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    query = {"user_id": user_id}
    if workspace_id:
        query["workspace_id"] = workspace_id
    
    total_leads = await db.leads.count_documents(query)
    
    leads_today_query = query.copy()
    leads_today_query["created_at"] = {"$gte": today.isoformat()}
    leads_today = await db.leads.count_documents(leads_today_query)
    
    conv_query = {"user_id": user_id}
    if workspace_id:
        conv_query["workspace_id"] = workspace_id
    
    messages_sent = await db.conversations.count_documents({**conv_query, "direction": "outbound"})
    responses = await db.conversations.count_documents({**conv_query, "direction": "inbound"})
    
    stmt_query = {"user_id": user_id, "analysis_status": "completed"}
    if workspace_id:
        stmt_query["workspace_id"] = workspace_id
    statements_analyzed = await db.statements.count_documents(stmt_query)
    
    # Get appointments and deals from leads
    appointments_booked = await db.leads.count_documents({**query, "pipeline_stage": {"$in": ["proposal_sent", "closed"]}})
    deals_closed = await db.leads.count_documents({**query, "pipeline_stage": "closed"})
    
    monthly_residual = deals_closed * 150.0
    
    pipeline_stages = ["new", "contacted", "interested", "statement_received", "proposal_sent", "closed"]
    pipeline_stats = {}
    for stage in pipeline_stages:
        count = await db.leads.count_documents({**query, "pipeline_stage": stage})
        pipeline_stats[stage] = count
    
    # Source stats
    source_stats = {}
    for source in LEAD_SOURCES.keys():
        count = await db.leads.count_documents({**query, "source": source})
        source_stats[source] = count
    source_stats["manual"] = await db.leads.count_documents({**query, "source": "manual"})
    
    return DashboardStats(
        total_leads=total_leads,
        leads_today=leads_today,
        messages_sent=messages_sent,
        responses=responses,
        statements_analyzed=statements_analyzed,
        appointments_booked=appointments_booked,
        deals_closed=deals_closed,
        monthly_residual=monthly_residual,
        pipeline_stats=pipeline_stats,
        source_stats=source_stats
    )

@api_router.get("/dashboard/activity", response_model=List[AIActivityLog])
async def get_ai_activity(
    workspace_id: Optional[str] = None,
    limit: int = Query(default=20, le=100),
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if workspace_id:
        query["workspace_id"] = workspace_id
    
    activities = await db.ai_activities.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [AIActivityLog(**a) for a in activities]

@api_router.get("/analytics/conversion")
async def get_conversion_analytics(
    workspace_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if workspace_id:
        query["workspace_id"] = workspace_id
    
    total_leads = await db.leads.count_documents(query)
    contacted = await db.leads.count_documents({**query, "pipeline_stage": {"$ne": "new"}})
    interested = await db.leads.count_documents({**query, "pipeline_stage": {"$in": ["interested", "statement_received", "proposal_sent", "closed"]}})
    closed = await db.leads.count_documents({**query, "pipeline_stage": "closed"})
    
    return {
        "total_leads": total_leads,
        "contacted": contacted,
        "interested": interested,
        "closed": closed,
        "contact_rate": (contacted / total_leads * 100) if total_leads > 0 else 0,
        "interest_rate": (interested / contacted * 100) if contacted > 0 else 0,
        "close_rate": (closed / interested * 100) if interested > 0 else 0,
        "overall_conversion": (closed / total_leads * 100) if total_leads > 0 else 0
    }

# ==================== ROOT & HEALTH ====================

@api_router.get("/")
async def root():
    return {"message": "AutoMerchant AI API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@api_router.post("/leads/generate")
async def generate_leads_alias(
    city: str,
    state: str,
    industry: str,
    count: int = Query(default=10, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Real lead generation from Leads page via Google Places"""
    location = f"{city.strip()}, {state.strip()}"
    workspaces = await db.workspaces.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).limit(1).to_list(1)
    workspace_id = workspaces[0]["id"] if workspaces else None
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Create a workspace first")
    return await generate_leads(workspace_id, location, industry, "google_maps", count, current_user)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@api_router.post("/leads/generate")
async def generate_leads_simple(
    city: str,
    state: str,
    industry: str,
    count: int = Query(default=10, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Alias route for lead generation from Leads page"""
    location = f"{city}, {state}"
    workspaces = await db.workspaces.find(
        {"user_id": current_user["id"], "industry": industry},
        {"_id": 0}
    ).limit(1).to_list(1)
    
    if not workspaces:
        raise HTTPException(status_code=404, detail="No workspace found for this industry. Create a workspace first.")
    
    workspace_id = workspaces[0]["id"]
    return await generate_leads(workspace_id, location, industry, "google_maps", count, current_user)
