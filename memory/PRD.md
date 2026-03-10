# AutoMerchant AI v2.0 - Product Requirements Document

## Original Problem Statement
Build a full production SaaS called "AutoMerchant AI" that can run AI-powered sales campaigns for ANY business type. The system includes multi-workspace support, industry templates, autonomous lead discovery, multi-channel outreach, and AI-powered document analysis.

## User Personas
1. **ISO Sales Agent** - Runs merchant services campaigns
2. **Real Estate Agent** - Uses for buyer/seller lead generation
3. **Insurance Agent** - Runs insurance product campaigns
4. **SaaS Sales Rep** - B2B software outreach
5. **Home Services Contractor** - Local service lead gen
6. **Agency Owner** - Manages multiple campaigns for clients

## Technical Stack
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Planned Integrations**: Claude AI, Twilio SMS, SendGrid Email, Google Maps API, VAPI Voice, ElevenLabs

---

## What's Been Implemented (v2.0) - March 2026

### Phase 1 - Core Platform:
- [x] JWT Authentication (register, login, protected routes)
- [x] Multi-workspace system with industry templates
- [x] 11 Pre-built industries with scoring rules, message templates, AI prompts

### Phase 2 - Industry Templates:
Industries implemented:
1. Merchant Services (payment processing)
2. Real Estate (property listings)
3. Insurance (business/personal insurance)
4. SaaS / Software (B2B tech sales)
5. Home Services (HVAC, plumbing, roofing)
6. Professional Services (lawyers, accountants)
7. Restaurant (food service)
8. Retail (stores, boutiques)
9. Medical / Dental (healthcare)
10. Automotive (repair, dealerships)
11. Beauty & Salons (hair, spa, nails)

Each includes:
- Custom lead scoring rules
- SMS/Email message templates
- AI conversation prompts
- Follow-up schedules

### Phase 3 - Lead Discovery Engine:
- [x] AI Lead Discovery with location/source selection
- [x] Multiple source support (Google Maps, Yelp, Facebook, LinkedIn, Instagram, Yellow Pages, Chamber)
- [x] Lead enrichment with estimated revenue, company size, social profiles
- [x] Smart lead scoring based on industry-specific rules

### Phase 4 - Campaign System:
- [x] Workspace-scoped campaigns
- [x] Multi-channel support (SMS, Email, Voice)
- [x] AI agent toggle for automated conversations
- [x] Auto follow-up scheduling

### Phase 5 - Dashboard & Analytics:
- [x] Workspace-filtered dashboard stats
- [x] Real-time AI Agent Activity feed
- [x] Pipeline visualization
- [x] Conversion analytics

---

## MOCKED APIs (To Be Integrated with Real APIs)
- **Lead Discovery Sources**: Simulated data generation (not real Google Maps/Yelp/etc)
- **Claude AI**: Statement analysis uses regex (not AI)
- **Twilio SMS**: Message sending simulated
- **SendGrid Email**: Email sending simulated
- **VAPI Voice**: Voice calling not integrated

---

## Prioritized Backlog

### P0 - Critical (Required for Production)
- [ ] Integrate Claude Sonnet 4.5 for AI conversations
- [ ] Integrate Twilio SMS for real message sending/receiving
- [ ] Integrate SendGrid for email outreach
- [ ] Add webhook handlers for SMS/Email replies

### P1 - High Priority
- [ ] Google Maps Places API for real lead discovery
- [ ] Automated background workers (Celery + Redis)
- [ ] VAPI + ElevenLabs voice agent
- [ ] Landing page generator per workspace

### P2 - Medium Priority
- [ ] Stripe subscription billing ($97/$297/$997 tiers)
- [ ] Team management (multi-user per account)
- [ ] Custom AI prompt training per workspace
- [ ] SEO landing pages (/restaurants-zero-fee-processing)

### P3 - Low Priority
- [ ] Social media content generator
- [ ] Blog post auto-generation
- [ ] Competitor detection
- [ ] White-label customization

---

## API Keys Required for Full Production
1. **Anthropic** - Claude Sonnet 4.5 API key
2. **Twilio** - Account SID + Auth Token + Phone Number
3. **SendGrid** - API Key
4. **Google Maps** - Places API Key
5. **VAPI** - API Key for voice agent
6. **ElevenLabs** - API Key for voice synthesis

---

## Next Tasks
1. Request API keys from user for production integrations
2. Implement Claude AI conversation engine
3. Add real SMS sending via Twilio
4. Create background worker system for automated follow-ups
5. Build landing page generator for SEO pages
