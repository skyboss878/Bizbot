from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'automerchant-ai-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="AutoMerchant AI API", version="1.0.0")

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
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class LeadCreate(BaseModel):
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
    score: int = 0
    pipeline_stage: str = "new"
    source: str = "manual"
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class ConversationCreate(BaseModel):
    lead_id: str
    channel: str  # sms, email, voice
    direction: str  # inbound, outbound
    content: str
    ai_generated: bool = False

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lead_id: str
    channel: str
    direction: str
    content: str
    ai_generated: bool
    timestamp: str

class StatementAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
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

class CampaignCreate(BaseModel):
    name: str
    campaign_type: str  # sms, email, voice
    target_industries: List[str]
    message_template: str
    status: str = "draft"

class CampaignResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    campaign_type: str
    target_industries: List[str]
    message_template: str
    status: str
    leads_contacted: int = 0
    responses: int = 0
    created_at: str

class DashboardStats(BaseModel):
    total_leads: int
    leads_today: int
    messages_sent: int
    responses: int
    statements_analyzed: int
    deals_closed: int
    monthly_residual: float
    pipeline_stats: Dict[str, int]

class AIActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
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
        created_at=current_user["created_at"]
    )

# ==================== LEADS ROUTES ====================

def calculate_lead_score(lead: dict) -> int:
    """Calculate lead score based on various factors"""
    score = 50  # Base score
    
    # Industry scoring
    high_value_industries = ['restaurant', 'smoke shop', 'liquor store', 'auto repair', 
                            'barbershop', 'nail salon', 'car wash', 'convenience store', 'retail']
    if lead.get('industry', '').lower() in high_value_industries:
        score += 25
    
    # Google rating
    rating = lead.get('google_rating', 0)
    if rating >= 4.5:
        score += 15
    elif rating >= 4.0:
        score += 10
    elif rating >= 3.5:
        score += 5
    
    # Review count (indicates business activity)
    reviews = lead.get('review_count', 0)
    if reviews >= 100:
        score += 10
    elif reviews >= 50:
        score += 5
    
    return min(score, 100)

@api_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, current_user: dict = Depends(get_current_user)):
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    lead_dict = lead_data.model_dump()
    lead_dict["id"] = lead_id
    lead_dict["user_id"] = current_user["id"]
    lead_dict["score"] = calculate_lead_score(lead_dict)
    lead_dict["pipeline_stage"] = "new"
    lead_dict["created_at"] = now
    lead_dict["updated_at"] = now
    
    await db.leads.insert_one(lead_dict)
    
    # Log AI activity
    await log_ai_activity("lead_created", lead_id, f"New lead: {lead_data.business_name}", "completed")
    
    return LeadResponse(**lead_dict)

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    pipeline_stage: Optional[str] = None,
    industry: Optional[str] = None,
    min_score: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    
    if pipeline_stage:
        query["pipeline_stage"] = pipeline_stage
    if industry:
        query["industry"] = {"$regex": industry, "$options": "i"}
    if min_score:
        query["score"] = {"$gte": min_score}
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
    lead_id: Optional[str] = None,
    channel: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if lead_id:
        query["lead_id"] = lead_id
    if channel:
        query["channel"] = channel
    
    convs = await db.conversations.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [ConversationResponse(**conv) for conv in convs]

@api_router.get("/leads/{lead_id}/conversations", response_model=List[ConversationResponse])
async def get_lead_conversations(lead_id: str, current_user: dict = Depends(get_current_user)):
    # Verify lead exists
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
    
    # Try to extract monthly volume
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
    
    # Try to extract effective rate
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
    
    # Try to extract fees
    fee_patterns = [
        r'total\s*(?:fees|charges)[:\s]*\$?([\d,]+\.?\d*)',
        r'fees\s*(?:paid|charged)[:\s]*\$?([\d,]+\.?\d*)',
    ]
    for pattern in fee_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data['fees_paid'] = float(match.group(1).replace(',', ''))
            break
    
    # Try to extract processor name
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
    lead_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Verify lead exists
    lead = await db.leads.find_one({"id": lead_id, "user_id": current_user["id"]})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Read and process PDF
    content = await file.read()
    text = ""
    
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise HTTPException(status_code=400, detail="Failed to read PDF file")
    
    # Extract data from statement
    extracted_data = extract_statement_data(text)
    
    # Calculate potential savings (assuming 0% with cash discount program)
    potential_savings = 0
    if extracted_data.get('fees_paid'):
        potential_savings = extracted_data['fees_paid'] * 12  # Annual savings
    elif extracted_data.get('monthly_volume') and extracted_data.get('effective_rate'):
        monthly_fees = extracted_data['monthly_volume'] * (extracted_data['effective_rate'] / 100)
        potential_savings = monthly_fees * 12
        extracted_data['fees_paid'] = monthly_fees
    
    statement_id = str(uuid.uuid4())
    statement_doc = {
        "id": statement_id,
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
        "raw_text": text[:5000],  # Store first 5000 chars
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.statements.insert_one(statement_doc)
    
    # Update lead pipeline
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"pipeline_stage": "statement_received", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log activity
    await log_ai_activity("statement_analyzed", lead_id, f"Statement analyzed: {file.filename}", "completed")
    
    return StatementAnalysis(**statement_doc)

@api_router.get("/statements", response_model=List[StatementAnalysis])
async def get_statements(
    lead_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if lead_id:
        query["lead_id"] = lead_id
    
    statements = await db.statements.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [StatementAnalysis(**s) for s in statements]

@api_router.get("/statements/{statement_id}", response_model=StatementAnalysis)
async def get_statement(statement_id: str, current_user: dict = Depends(get_current_user)):
    statement = await db.statements.find_one(
        {"id": statement_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    return StatementAnalysis(**statement)

# ==================== CAMPAIGNS ROUTES ====================

@api_router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(campaign_data: CampaignCreate, current_user: dict = Depends(get_current_user)):
    campaign_id = str(uuid.uuid4())
    campaign_dict = campaign_data.model_dump()
    campaign_dict["id"] = campaign_id
    campaign_dict["user_id"] = current_user["id"]
    campaign_dict["leads_contacted"] = 0
    campaign_dict["responses"] = 0
    campaign_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.campaigns.insert_one(campaign_dict)
    return CampaignResponse(**campaign_dict)

@api_router.get("/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(current_user: dict = Depends(get_current_user)):
    campaigns = await db.campaigns.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
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

async def log_ai_activity(activity_type: str, lead_id: Optional[str], description: str, status: str):
    """Log AI agent activity"""
    activity = {
        "id": str(uuid.uuid4()),
        "activity_type": activity_type,
        "lead_id": lead_id,
        "description": description,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.ai_activities.insert_one(activity)

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get total leads
    total_leads = await db.leads.count_documents({"user_id": user_id})
    
    # Get leads created today
    leads_today = await db.leads.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": today.isoformat()}
    })
    
    # Get messages sent
    messages_sent = await db.conversations.count_documents({
        "user_id": user_id,
        "direction": "outbound"
    })
    
    # Get responses (inbound messages)
    responses = await db.conversations.count_documents({
        "user_id": user_id,
        "direction": "inbound"
    })
    
    # Get statements analyzed
    statements_analyzed = await db.statements.count_documents({
        "user_id": user_id,
        "analysis_status": "completed"
    })
    
    # Get deals closed
    deals_closed = await db.leads.count_documents({
        "user_id": user_id,
        "pipeline_stage": "closed"
    })
    
    # Calculate estimated monthly residual (assume $150/merchant average)
    monthly_residual = deals_closed * 150.0
    
    # Get pipeline stats
    pipeline_stages = ["new", "contacted", "interested", "statement_received", "proposal_sent", "closed"]
    pipeline_stats = {}
    for stage in pipeline_stages:
        count = await db.leads.count_documents({"user_id": user_id, "pipeline_stage": stage})
        pipeline_stats[stage] = count
    
    return DashboardStats(
        total_leads=total_leads,
        leads_today=leads_today,
        messages_sent=messages_sent,
        responses=responses,
        statements_analyzed=statements_analyzed,
        deals_closed=deals_closed,
        monthly_residual=monthly_residual,
        pipeline_stats=pipeline_stats
    )

@api_router.get("/dashboard/activity", response_model=List[AIActivityLog])
async def get_ai_activity(
    limit: int = Query(default=20, le=100),
    current_user: dict = Depends(get_current_user)
):
    # Get recent activities (for now, show all - in production would filter by user)
    activities = await db.ai_activities.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [AIActivityLog(**a) for a in activities]

@api_router.get("/analytics/conversion")
async def get_conversion_analytics(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    
    total_leads = await db.leads.count_documents({"user_id": user_id})
    contacted = await db.leads.count_documents({"user_id": user_id, "pipeline_stage": {"$ne": "new"}})
    interested = await db.leads.count_documents({"user_id": user_id, "pipeline_stage": {"$in": ["interested", "statement_received", "proposal_sent", "closed"]}})
    closed = await db.leads.count_documents({"user_id": user_id, "pipeline_stage": "closed"})
    
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

# ==================== LEAD GENERATION (Simulated) ====================

@api_router.post("/leads/generate")
async def generate_leads(
    city: str,
    state: str,
    industry: str,
    count: int = Query(default=10, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Generate simulated leads for demo purposes"""
    # In production, this would integrate with Google Maps API
    industries_data = {
        "restaurant": ["Grill", "Bistro", "Kitchen", "Cafe", "Diner", "Pizzeria"],
        "barbershop": ["Barbershop", "Cuts", "Grooming", "Men's Salon", "Hair Studio"],
        "nail salon": ["Nails", "Spa", "Beauty", "Nail Bar", "Manicure"],
        "auto repair": ["Auto", "Mechanic", "Garage", "Auto Care", "Service Center"],
        "smoke shop": ["Smoke", "Tobacco", "Vape", "CBD", "Glass Shop"],
        "liquor store": ["Liquor", "Wine & Spirits", "Beverage", "Package Store"],
        "convenience store": ["Mart", "Stop", "Express", "Quick Stop", "Corner Store"],
        "car wash": ["Car Wash", "Auto Spa", "Detail", "Shine", "Clean"]
    }
    
    suffixes = industries_data.get(industry.lower(), ["Business", "Shop", "Store"])
    first_names = ["John", "Mike", "Sarah", "David", "Lisa", "James", "Maria", "Robert", "Jennifer", "Michael"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    
    generated_leads = []
    for i in range(count):
        import random
        business_name = f"{random.choice(['Golden', 'Premier', 'Classic', 'Modern', 'Local', 'Downtown', 'Elite', 'Quality', 'Best', 'Top'])} {random.choice(suffixes)}"
        owner_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        
        # Clean names for email/website
        email_name = owner_name.lower().replace(' ', '.')
        clean_business = business_name.lower().replace(' ', '').replace("'", '')
        
        lead_data = LeadCreate(
            business_name=business_name,
            owner_name=owner_name,
            phone=f"+1{random.randint(200,999)}{random.randint(200,999)}{random.randint(1000,9999)}",
            email=f"{email_name}@{clean_business[:10]}.com",
            website=f"www.{clean_business[:15]}.com",
            industry=industry,
            city=city,
            state=state,
            google_rating=round(random.uniform(3.5, 5.0), 1),
            review_count=random.randint(10, 200),
            source="ai_generated"
        )
        
        lead = await create_lead(lead_data, current_user)
        generated_leads.append(lead)
    
    await log_ai_activity(
        "lead_generation",
        None,
        f"Generated {count} {industry} leads in {city}, {state}",
        "completed"
    )
    
    return {"message": f"Generated {count} leads", "leads": generated_leads}

# ==================== ROOT & HEALTH ====================

@api_router.get("/")
async def root():
    return {"message": "AutoMerchant AI API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

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
