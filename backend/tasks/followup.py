"""
Follow-up Tasks - Automated follow-up sequences
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
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


@shared_task(name='tasks.followup.check_pending_followups')
def check_pending_followups():
    """
    Check for leads that need follow-up messages
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # Get all workspaces
    workspaces = list(db.workspaces.find({"status": "active"}))
    
    followups_scheduled = 0
    
    for workspace in workspaces:
        workspace_id = workspace["id"]
        follow_up_schedule = workspace.get("follow_up_schedule", [1, 3, 7])
        templates = workspace.get("templates", {})
        
        # Get leads that have been contacted but not responded
        leads = list(db.leads.find({
            "workspace_id": workspace_id,
            "pipeline_stage": "contacted"
        }))
        
        for lead in leads:
            # Get last conversation
            last_conv = db.conversations.find_one(
                {"lead_id": lead["id"]},
                sort=[("timestamp", -1)]
            )
            
            if not last_conv:
                continue
            
            # Check if there's been an inbound response
            inbound_after = db.conversations.find_one({
                "lead_id": lead["id"],
                "direction": "inbound",
                "timestamp": {"$gt": last_conv["timestamp"]}
            })
            
            if inbound_after:
                # Lead responded, update stage
                db.leads.update_one(
                    {"id": lead["id"]},
                    {"$set": {"pipeline_stage": "interested", "updated_at": now.isoformat()}}
                )
                continue
            
            # Calculate days since last message
            last_msg_time = datetime.fromisoformat(last_conv["timestamp"].replace("Z", "+00:00"))
            days_since = (now - last_msg_time).days
            
            # Count existing outbound messages
            outbound_count = db.conversations.count_documents({
                "lead_id": lead["id"],
                "direction": "outbound"
            })
            
            # Check if it's time for next follow-up
            if outbound_count <= len(follow_up_schedule):
                target_day = follow_up_schedule[outbound_count - 1] if outbound_count > 0 else 0
                
                if days_since >= target_day:
                    # Schedule follow-up
                    schedule_followup.delay(lead["id"], workspace_id, outbound_count + 1)
                    followups_scheduled += 1
    
    return {"status": "success", "followups_scheduled": followups_scheduled}


@shared_task(name='tasks.followup.schedule_followup')
def schedule_followup(lead_id: str, workspace_id: str, followup_number: int):
    """
    Send a follow-up message to a lead
    """
    db = get_db()
    
    lead = db.leads.find_one({"id": lead_id})
    if not lead:
        return {"status": "error", "message": "Lead not found"}
    
    workspace = db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        return {"status": "error", "message": "Workspace not found"}
    
    templates = workspace.get("templates", {})
    
    # Get appropriate follow-up template
    if followup_number == 2:
        template = templates.get("sms_followup", "Hi {{owner_name}}, just following up on my previous message about {{business_name}}. Would love to chat!")
    elif followup_number == 3:
        template = templates.get("sms_followup_2", "{{owner_name}}, last check-in! Many businesses like {{business_name}} save thousands with our solution. Worth a quick call?")
    else:
        template = templates.get("sms_followup", "Hi {{owner_name}}, following up regarding {{business_name}}. Let me know if you have any questions!")
    
    message = personalize_message(template, lead)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create conversation
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
        "followup_number": followup_number,
        "status": "sent",
        "timestamp": now
    })
    
    # Log activity
    db.ai_activities.insert_one({
        "id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "activity_type": "followup_sent",
        "lead_id": lead_id,
        "description": f"Follow-up #{followup_number} sent to {lead['business_name']}",
        "status": "completed",
        "timestamp": now
    })
    
    return {"status": "success", "conversation_id": conv_id, "followup_number": followup_number}


@shared_task(name='tasks.followup.process_responses')
def process_responses():
    """
    Process inbound responses and update lead stages
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # Get recent inbound messages
    recent_responses = list(db.conversations.find({
        "direction": "inbound",
        "processed": {"$ne": True},
        "timestamp": {"$gte": (now - timedelta(hours=1)).isoformat()}
    }))
    
    processed = 0
    
    for response in recent_responses:
        lead_id = response["lead_id"]
        lead = db.leads.find_one({"id": lead_id})
        
        if not lead:
            continue
        
        # Update lead stage to interested
        if lead.get("pipeline_stage") in ["new", "contacted"]:
            db.leads.update_one(
                {"id": lead_id},
                {"$set": {"pipeline_stage": "interested", "updated_at": now.isoformat()}}
            )
        
        # Mark response as processed
        db.conversations.update_one(
            {"id": response["id"]},
            {"$set": {"processed": True}}
        )
        
        # Log activity
        db.ai_activities.insert_one({
            "id": str(uuid.uuid4()),
            "workspace_id": response.get("workspace_id"),
            "activity_type": "response_received",
            "lead_id": lead_id,
            "description": f"Response from {lead['business_name']}",
            "status": "completed",
            "timestamp": now.isoformat()
        })
        
        processed += 1
    
    return {"status": "success", "responses_processed": processed}


@shared_task(name='tasks.followup.create_followup_sequence')
def create_followup_sequence(lead_id: str, workspace_id: str):
    """
    Create a follow-up sequence for a lead
    """
    db = get_db()
    
    workspace = db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        return {"status": "error", "message": "Workspace not found"}
    
    follow_up_schedule = workspace.get("follow_up_schedule", [1, 3, 7])
    now = datetime.now(timezone.utc)
    
    # Create follow-up sequence entries
    sequence_id = str(uuid.uuid4())
    
    for i, days in enumerate(follow_up_schedule):
        scheduled_time = now + timedelta(days=days)
        
        db.followup_queue.insert_one({
            "id": str(uuid.uuid4()),
            "sequence_id": sequence_id,
            "lead_id": lead_id,
            "workspace_id": workspace_id,
            "followup_number": i + 1,
            "scheduled_at": scheduled_time.isoformat(),
            "status": "pending",
            "created_at": now.isoformat()
        })
    
    return {"status": "success", "sequence_id": sequence_id, "followups_scheduled": len(follow_up_schedule)}
