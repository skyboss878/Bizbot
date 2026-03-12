"""
Celery Configuration for AutoMerchant AI Background Workers
"""
import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

# Redis URL for Celery broker and backend
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# SSL options for Upstash Redis
REDIS_SSL_OPTS = {
    "ssl_cert_reqs": "CERT_NONE"
} if REDIS_URL.startswith("rediss://") else {}

# Create Celery app
celery_app = Celery(
    'automerchant',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['tasks.lead_discovery', 'tasks.outreach', 'tasks.followup', 'tasks.enrichment']
)

celery_app.conf.broker_transport_options = REDIS_SSL_OPTS
celery_app.conf.redis_backend_use_ssl = REDIS_SSL_OPTS

# Celery Configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
    result_expires=3600,  # Results expire after 1 hour
)

# Beat Schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Run lead discovery every hour during business hours
    'discover-leads-hourly': {
        'task': 'tasks.lead_discovery.scheduled_discovery',
        'schedule': crontab(minute=0, hour='9-17'),  # Every hour 9am-5pm
    },
    # Run follow-up check every 30 minutes
    'check-followups': {
        'task': 'tasks.followup.check_pending_followups',
        'schedule': crontab(minute='*/30'),
    },
    # Enrich new leads every 15 minutes
    'enrich-leads': {
        'task': 'tasks.enrichment.enrich_pending_leads',
        'schedule': crontab(minute='*/15'),
    },
    # Run campaign outreach every 10 minutes
    'run-campaigns': {
        'task': 'tasks.outreach.process_campaign_queue',
        'schedule': crontab(minute='*/10'),
    },
    # Daily summary report at 6pm
    'daily-summary': {
        'task': 'tasks.outreach.send_daily_summary',
        'schedule': crontab(minute=0, hour=18),
    },
}

if __name__ == '__main__':
    celery_app.start()
