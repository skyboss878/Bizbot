# AutoMerchant AI - Product Requirements Document

## Original Problem Statement
Build a full production SaaS called "AutoMerchant AI" - an AI-powered merchant services sales agent that can find leads, contact them, follow up automatically, analyze merchant statements, and close deals for payment processing with cash discount / zero-fee processing programs.

## User Personas
1. **ISO Sales Agent** - Uses the platform to automate lead generation and outreach
2. **ISO Manager** - Monitors team performance and deals via dashboard
3. **Payment Processing Company** - Tracks residual revenue and merchant acquisition

## Core Requirements (Static)
- Autonomous lead generation from multiple sources
- AI-powered lead qualification and scoring
- Multi-channel outreach (SMS, Email, Voice)
- Merchant statement analysis
- CRM pipeline management
- Analytics and reporting dashboard
- SaaS subscription model

## Technical Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Integrations Planned**: Claude AI, Twilio SMS, SendGrid Email, Google Maps API, VAPI Voice

---

## What's Been Implemented (MVP) - March 2026

### Phase 1 Complete:
- [x] JWT Authentication (register, login, protected routes)
- [x] Lead Management System with scoring algorithm
- [x] AI Lead Generation (simulated - generates mock leads by city/industry)
- [x] Pipeline Management (6 stages: New → Contacted → Interested → Statement Received → Proposal Sent → Closed)
- [x] Conversation Tracking (SMS, Email, Voice channels)
- [x] Merchant Statement Upload & Analysis (PDF parsing)
- [x] Campaign Management System
- [x] Dashboard with KPIs and AI Activity Feed
- [x] Analytics with Charts (Sales Funnel, Pipeline Distribution, Revenue Growth)
- [x] Settings (Profile, Integrations, Notifications, Billing plans)

### UI/UX Implemented:
- Dark theme dashboard with Barlow Condensed / Manrope fonts
- Electric Blue (#3B82F6) and Cyber Violet (#8B5CF6) accent colors
- Grid texture backgrounds
- Responsive sidebar navigation
- Real-time AI Agent Activity indicator

---

## MOCKED APIs (To Be Integrated with Real APIs)
- **Twilio SMS**: Message sending is simulated, no real SMS sent
- **SendGrid Email**: Email sending is simulated, no real emails sent
- **Google Maps API**: Lead generation uses mock data, not real business search
- **Claude AI**: Statement analysis uses regex extraction, not AI
- **VAPI Voice**: Voice calling not yet integrated

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Integrate Claude Sonnet 4.5 for AI-powered statement analysis
- [ ] Integrate Twilio SMS for real message sending/receiving
- [ ] Integrate SendGrid for email outreach
- [ ] Add webhook handlers for SMS/Email replies

### P1 - High Priority
- [ ] Google Maps Places API integration for real lead scraping
- [ ] Automated follow-up scheduler (background workers)
- [ ] VAPI + ElevenLabs voice agent integration
- [ ] Redis job queue setup for background automation

### P2 - Medium Priority
- [ ] Stripe subscription integration
- [ ] Team management (multiple users per account)
- [ ] White-label customization
- [ ] Landing page generator

### P3 - Low Priority
- [ ] Social media post generator
- [ ] Email campaign analytics
- [ ] Competitor processor detection
- [ ] Residual commission tracking

---

## Next Tasks List
1. Request API keys from user (Anthropic, Twilio, SendGrid, Google Maps)
2. Implement Claude AI for statement analysis
3. Add real SMS sending via Twilio
4. Create background worker system with Celery/Redis
5. Implement automated follow-up sequences
