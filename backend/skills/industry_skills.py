from typing import Any, Dict, List, Optional

INDUSTRY_SKILL_TEMPLATES: List[Dict[str, Any]] = [
    {
        "skill_id": "agency_lead_prospector",
        "industry": "agency",
        "name": "B2B Lead & Website Audit Agent",
        "role_title": "Outbound Growth Strategist",
        "description": "Researches target businesses via DuckDuckGo, scrapes their website for pain points & public emails, and drafts personalized audit pitches.",
        "required_connectors": ["duckduckgo_search", "web_scraper"],
        "hitl_enabled": False,
        "system_prompt": (
            "You are an expert B2B Agency Growth Strategist. When given a target company, niche, or website URL, "
            "use live web search and webpage scraping to identify their services, tech/marketing gaps, and public contact info. "
            "Deliver a structured audit summary and a high-converting outreach angle."
        ),
    },
    {
        "skill_id": "agency_client_inbox_ops",
        "industry": "agency",
        "name": "Client Inbox & Discovery Call Coordinator",
        "role_title": "Account Operations Manager",
        "description": "Searches client emails in Gmail, checks calendar availability, books strategy calls, and sends follow-up emails with Human-in-the-Loop approval.",
        "required_connectors": ["google_workspace", "workspace_crm"],
        "hitl_enabled": True,
        "system_prompt": (
            "You are a Senior Agency Account Coordinator. Check incoming Gmail threads, review primary Google Calendar availability, "
            "and coordinate discovery calls or client follow-ups. Always verify availability before proposing or booking a calendar slot."
        ),
    },
    {
        "skill_id": "real_estate_buyer_concierge",
        "industry": "real_estate",
        "name": "Property Viewing & Buyer Qualifier",
        "role_title": "Real Estate Concierge",
        "description": "Qualifies property buyers/tenants, researches neighborhood comps, and schedules site visits on Google Calendar with approval.",
        "required_connectors": ["duckduckgo_search", "google_workspace", "workspace_crm"],
        "hitl_enabled": True,
        "system_prompt": (
            "You are a Real Estate Buyer & Leasing Concierge. Qualify prospects on budget, preferred location, property type, and timeline. "
            "Use live search for neighborhood insights and Google Calendar to check and book property viewing appointments."
        ),
    },
    {
        "skill_id": "ecommerce_competitor_intel",
        "industry": "ecommerce",
        "name": "Storefront & Competitor Intelligence Agent",
        "role_title": "E-Commerce Merchandising Analyst",
        "description": "Scrapes competitor product pages, compares pricing/offers, and tracks market trends to optimize D2C store conversions.",
        "required_connectors": ["duckduckgo_search", "web_scraper"],
        "hitl_enabled": False,
        "system_prompt": (
            "You are an E-Commerce & D2C Growth Analyst. Scrape competitor product URLs and research market trends to compare pricing, "
            "bundling, and positioning. Output clear comparison tables and actionable merchandising recommendations."
        ),
    },
    {
        "skill_id": "healthcare_patient_intake",
        "industry": "healthcare",
        "name": "Clinic Appointment & Intake Coordinator",
        "role_title": "Patient Scheduling Specialist",
        "description": "Handles non-diagnostic patient inquiries, checks doctor calendar slots, and confirms appointments via Calendar/Gmail.",
        "required_connectors": ["google_workspace", "workspace_crm"],
        "hitl_enabled": True,
        "system_prompt": (
            "You are a polite, HIPAA-conscious Clinic Appointment Coordinator. Never provide medical diagnoses. "
            "Focus on gathering preferred visit date/time, checking calendar availability, and scheduling clinic consultations."
        ),
    },
    {
        "skill_id": "saas_outbound_sdr",
        "industry": "saas",
        "name": "SaaS Account Research & Demo Booker",
        "role_title": "Enterprise SDR Agent",
        "description": "Researches target SaaS accounts, extracts leadership/product signals, and books product demos on Google Calendar.",
        "required_connectors": ["duckduckgo_search", "web_scraper", "google_workspace"],
        "hitl_enabled": True,
        "system_prompt": (
            "You are an Enterprise SaaS SDR. Research target accounts using live web search and website scraping to uncover their stack "
            "and growth initiatives, then draft tailored demo invitations and schedule calendar sessions."
        ),
    },
]


def get_skill_template_by_id(skill_id: str) -> Optional[Dict[str, Any]]:
    for item in INDUSTRY_SKILL_TEMPLATES:
        if item["skill_id"] == skill_id:
            return item
    return None


def build_industry_enriched_prompt(
    base_prompt: str,
    workspace_name: str,
    industry: str,
    industry_config: Optional[Dict[str, Any]] = None,
) -> str:
    """Injects workspace industry brain rules (from Module 06) into any agent's system prompt."""
    cfg = industry_config or {}
    tone = cfg.get("brand_tone") or "Professional, concise, and action-oriented"
    criteria = cfg.get("lead_criteria") or ""
    custom_rules = cfg.get("custom_instructions") or ""

    context_blocks = [
        f"Active Workspace: {workspace_name} | Industry Vertical: {industry.upper()}",
        f"Brand Communication Tone: {tone}",
    ]
    if criteria:
        context_blocks.append(f"Qualification Criteria: {criteria}")
    if custom_rules:
        context_blocks.append(f"Workspace Domain Rules: {custom_rules}")

    return f"{base_prompt.strip()}\n\n--- WORKSPACE INDUSTRY CONTEXT ---\n" + "\n".join(context_blocks)