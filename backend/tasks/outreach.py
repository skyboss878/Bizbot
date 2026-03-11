"""
Outreach Tasks - Automated SMS, Email, and Voice outreach
"""
import os
import uuid
from datetime import datetime, timezone
from celery import shared_task
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'automerchant')

def get_db():
    client = MongoClient(mongo_url)
    return client[db_name]


def personalize_message(template: str, lead: dict) -> str:
    """Replace template variables with lead data"""
    replacements = {
        "{{owner_name}}": lead.get("owner_name", "there"),
        "{{business_name}}": lead.get("business_name", "your business"),
        "{{industry}}": lead.get("industry", "business"),
        "{{city}}": lead.get("city", ""),
        "{{state}}": lead.get("state", ""),
    }
    
    message = template
    for key, value in replacements.items():
        message = message.replace(key, str(value))
    
    return message


@shared_task(bind=True, name='tasks.outreach.send_sms')
def send_sms(self, lead_id: str, workspace_id: str, message: str):
    """
    Send SMS to a lead
    In production, this would integrate with Twilio
    """
    db = get_db()
    
    lead = db.leads.find_one({"id": lead_id})
    if not lead:
        return {"status": "error", "message": "Lead not found"}
    
    if not lead.get("phone"):
        return {"status": "error", "message": "Lead has no phone number"}
    
    # Simulate SMS sending (in production, call Twilio API)
    # twilio_client.messages.create(
    #     body=message,
    #     from_=TWILIO_PHONE,
    #     to=lead["phone"]
    # )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Log conversation
    conv_id = str(uuid.uuid4())
    db.conversations.insert_one({
        "id": conv_id,
        "workspace_id": workspace_id,
        "lead_id": lead_id,
        "user_id": lead.get("user_id"),
        "channel": "sms",
        "direction": "outbound",
        "content": message,
        "ai_generated": True,
        "status": "sent",  # In production: "delivered" after confirmation
        "timestamp": now
    })
    
    # Update lead pipeline if first contact
    if lead.get("pipeline_stage") == "new":
        db.leads.update_one(
            {"id": lead_id},
            {"$set": {"pipeline_stage": "contacted", "updated_at": now}}
        )
    
    # Log activity
    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "activity_type": "sms_sent",
        "lead_id": lead_id,
        "description": f"SMS sent to {lead['business_name']}",
        "status": "completed",
        "timestamp": now
    })
    
    return {"status": "success", "conversation_id": conv_id}


@shared_task(bind=True, name='tasks.outreach.send_email')
def send_email(self, lead_id: str, workspace_id: str, subject: str, body: str):
    """
    Send email to a lead
    In production, this would integrate with SendGrid
    """
    db = get_db()
    
    lead = db.leads.find_one({"id": lead_id})
    if not lead:
        return {"status": "error", "message": "Lead not found"}
    
    if not lead.get("email"):
        return {"status": "error", "message": "Lead has no email"}
    
    # Simulate email sending (in production, call SendGrid API)
    # sg.send(Mail(
    #     from_email=FROM_EMAIL,
    #     to_emails=lead["email"],
    #     subject=subject,
    #     html_content=body
    # ))
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Log conversation
    conv_id = str(uuid.uuid4())
    db.conversations.insert_one({
        "id": conv_id,
        "workspace_id": workspace_id,
        "lead_id": lead_id,
        "user_id": lead.get("user_id"),
        "channel": "email",
        "direction": "outbound",
        "content": f"Subject: {subject}\n\n{body}",
        "ai_generated": True,
        "status": "sent",
        "timestamp": now
    })
    
    # Update lead pipeline
    if lead.get("pipeline_stage") == "new":
        db.leads.update_one(
            {"id": lead_id},
            {"$set": {"pipeline_stage": "contacted", "updated_at": now}}
        )
    
    # Log activity
    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "activity_type": "email_sent",
        "lead_id": lead_id,
        "description": f"Email sent to {lead['business_name']}",
        "status": "completed",
        "timestamp": now
    })
    
    return {"status": "success", "conversation_id": conv_id}


@shared_task(name='tasks.outreach.process_campaign_queue')
def process_campaign_queue():
    """
    Process active campaigns and send outreach messages
    """
    db = get_db()
    
    # Get active campaigns
    active_campaigns = list(db.campaigns.find({"status": "active"}))
    
    messages_sent = 0
    
    for campaign in active_campaigns:
        workspace_id = campaign["workspace_id"]
        workspace = db.workspaces.find_one({"id": workspace_id})
        
        if not workspace:
            continue
        
        # Get leads that haven't been contacted yet for this campaign
        query = {
            "workspace_id": workspace_id,
            "pipeline_stage": "new",
            "industry": {"$in": campaign.get("target_industries", [])}
        }
        
        if campaign.get("target_locations"):
            query["city"] = {"$in": campaign["target_locations"]}
        
        leads_to_contact = list(db.leads.find(query).limit(10))  # Process 10 at a time
        
        for lead in leads_to_contact:
            # Personalize message
            message = personalize_message(campaign["message_template"], lead)
            
            if campaign["campaign_type"] == "sms":
                send_sms.delay(lead["id"], workspace_id, message)
            elif campaign["campaign_type"] == "email":
                # Parse subject from template if email
                lines = message.split("\n")
                subject = lines[0].replace("Subject:", "").strip() if lines[0].startswith("Subject:") else "Message from us"
                body = "\n".join(lines[1:]).strip()
                send_email.delay(lead["id"], workspace_id, subject, body)
            
            messages_sent += 1
        
        # Update campaign stats
        db.campaigns.update_one(
            {"id": campaign["id"]},
            {"$inc": {"leads_contacted": len(leads_to_contact)}}
        )
    
    return {"status": "success", "campaigns_processed": len(active_campaigns), "messages_queued": messages_sent}


@shared_task(name='tasks.outreach.run_campaign')
def run_campaign(campaign_id: str, batch_size: int = 20):
    """
    Run a specific campaign with a batch of leads
    """
    db = get_db()
    
    campaign = db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        return {"status": "error", "message": "Campaign not found"}
    
    workspace_id = campaign["workspace_id"]
    workspace = db.workspaces.find_one({"id": workspace_id})
    
    if not workspace:
        return {"status": "error", "message": "Workspace not found"}
    
    # Get uncontacted leads
    query = {
        "workspace_id": workspace_id,
        "pipeline_stage": "new"
    }
    
    leads = list(db.leads.find(query).limit(batch_size))
    
    messages_sent = 0
    
    for lead in leads:
        message = personalize_message(campaign["message_template"], lead)
        
        if campaign["campaign_type"] == "sms":
            send_sms.delay(lead["id"], workspace_id, message)
        elif campaign["campaign_type"] == "email":
            lines = message.split("\n")
            subject = lines[0].replace("Subject:", "").strip() if lines[0].startswith("Subject:") else "Message"
            body = "\n".join(lines[1:]).strip()
            send_email.delay(lead["id"], workspace_id, subject, body)
        
        messages_sent += 1
    
    # Update campaign
    db.campaigns.update_one(
        {"id": campaign_id},
        {"$inc": {"leads_contacted": messages_sent}}
    )
    
    # Log activity
    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "activity_type": "campaign_batch",
        "lead_id": None,
        "description": f"Campaign '{campaign['name']}' sent {messages_sent} messages",
        "status": "completed",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"status": "success", "messages_sent": messages_sent}


@shared_task(name='tasks.outreach.send_daily_summary')
def send_daily_summary():
    """
    Send daily summary to all users
    """
    db = get_db()
    
    # Get all users
    users = list(db.users.find({}, {"_id": 0, "id": 1, "email": 1, "name": 1}))
    
    summaries_sent = 0
    
    for user in users:
        # Get user's stats for today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        leads_today = db.leads.count_documents({
            "user_id": user["id"],
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        messages_today = db.conversations.count_documents({
            "user_id": user["id"],
            "direction": "outbound",
            "timestamp": {"$gte": today_start.isoformat()}
        })
        
        responses_today = db.conversations.count_documents({
            "user_id": user["id"],
            "direction": "inbound",
            "timestamp": {"$gte": today_start.isoformat()}
        })
        
        # Log summary (in production, send email)
        db.ai_activities.insert_one({
            "id": str(uuid.uuid4()),
            "workspace_id": None,
            "activity_type": "daily_summary",
            "lead_id": None,
            "description": f"Daily summary for {user['name']}: {leads_today} leads, {messages_today} messages, {responses_today} responses",
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        summaries_sent += 1
    
    return {"status": "success", "summaries_sent": summaries_sent}
