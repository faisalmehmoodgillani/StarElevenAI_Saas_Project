import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy.orm import Session

from backend.database.models import WorkspaceIntegration
from backend.services.security import decrypt_api_key, encrypt_api_key

TOOL_CATALOG: List[Dict[str, Any]] = [
    {
        "connector_id": "duckduckgo_search",
        "name": "DuckDuckGo Live Web Search",
        "category": "Search & Research",
        "auth_type": "free_native",
        "is_free_default": True,
        "requires_hitl": False,
        "description": "Free real-time web search for market research, company lookups, and news. Zero API key needed.",
        "capabilities": ["duckduckgo_web_search"],
        "fields": [],
    },
    {
        "connector_id": "web_scraper",
        "name": "Smart Web & Lead Scraper",
        "category": "Search & Research",
        "auth_type": "free_native",
        "is_free_default": True,
        "requires_hitl": False,
        "description": "Extracts clean webpage content, headings, and public contact emails from any website URL.",
        "capabilities": ["scrape_webpage_content"],
        "fields": [],
    },
    {
        "connector_id": "workspace_crm",
        "name": "StarEleven Tenant CRM",
        "category": "CRM & Pipeline",
        "auth_type": "free_native",
        "is_free_default": True,
        "requires_hitl": False,
        "description": "Reads and manages tenant-isolated workspace leads, pipeline stages, and workspace records.",
        "capabilities": ["crm_lookup", "crm_create_lead"],
        "fields": [],
    },
    {
        "connector_id": "google_workspace",
        "name": "Google Workspace (Gmail + Calendar)",
        "category": "Productivity & Outreach",
        "auth_type": "oauth2_google",
        "is_free_default": False,
        "requires_hitl": True,
        "description": "1-Click Google OAuth sync to read/draft/send Gmail messages and check/book Google Calendar meetings with HITL approval.",
        "capabilities": ["gmail_search", "gmail_send_email", "calendar_list_events", "calendar_create_event"],
        "fields": [],
    },
    {
        "connector_id": "tavily_search",
        "name": "Tavily Deep AI Search",
        "category": "Search & Research",
        "auth_type": "api_key",
        "is_free_default": False,
        "requires_hitl": False,
        "description": "Optional deep AI-optimized web research upgrade using your own Tavily API key stored in AES-256 vault.",
        "capabilities": ["tavily_deep_search"],
        "fields": [
            {"key": "api_key", "label": "Tavily API Key", "placeholder": "tvly-...", "secret": True}
        ],
    },
    {
        "connector_id": "slack_webhook",
        "name": "Slack Team Alerts",
        "category": "Messaging & Alerts",
        "auth_type": "api_key",
        "is_free_default": False,
        "requires_hitl": True,
        "description": "Send lead alerts and daily summaries directly to a Slack channel via Incoming Webhook URL.",
        "capabilities": ["slack_post_message"],
        "fields": [
            {
                "key": "webhook_url",
                "label": "Slack Incoming Webhook URL",
                "placeholder": "https://hooks.slack.com/services/...",
                "secret": True,
            }
        ],
    },
    {
        "connector_id": "whatsapp_cloud",
        "name": "WhatsApp Cloud API",
        "category": "Messaging & Alerts",
        "auth_type": "api_key",
        "is_free_default": False,
        "requires_hitl": True,
        "description": "Send approved WhatsApp template or follow-up messages via Meta WhatsApp Cloud API.",
        "capabilities": ["whatsapp_send_message"],
        "fields": [
            {"key": "access_token", "label": "Meta Permanent Access Token", "placeholder": "EAAB...", "secret": True},
            {"key": "phone_number_id", "label": "Phone Number ID", "placeholder": "109876543210", "secret": False},
        ],
    },
    {
        "connector_id": "custom_mcp",
        "name": "Remote MCP Server (HTTP / SSE)",
        "category": "Model Context Protocol",
        "auth_type": "mcp_remote",
        "is_free_default": False,
        "requires_hitl": False,
        "description": "Connect any external MCP server (Zapier MCP, Composio, HubSpot MCP, Notion MCP, or custom FastMCP URL).",
        "capabilities": ["dynamic_mcp_tools"],
        "fields": [
            {
                "key": "mcp_url",
                "label": "Remote MCP Server URL",
                "placeholder": "https://mcp.example.com/sse",
                "secret": False,
            },
            {
                "key": "bearer_token",
                "label": "Optional Bearer / API Token",
                "placeholder": "Leave blank if public/URL-authenticated",
                "secret": True,
            },
        ],
    },
]


def get_catalog_item(connector_id: str) -> Optional[Dict[str, Any]]:
    for item in TOOL_CATALOG:
        if item["connector_id"] == connector_id:
            return item
    return None


def sign_oauth_state(workspace_id: str) -> str:
    secret = (os.getenv("ENCRYPTION_KEY") or "stareleven-dev-state-secret").encode()
    sig = hmac.new(secret, workspace_id.encode(), hashlib.sha256).hexdigest()[:24]
    return f"{workspace_id}.{sig}"


def verify_oauth_state(state_value: str) -> Optional[str]:
    if not state_value or "." not in state_value:
        return None
    workspace_id, provided_sig = state_value.rsplit(".", 1)
    expected = sign_oauth_state(workspace_id).rsplit(".", 1)[1]
    if hmac.compare_digest(provided_sig, expected):
        return workspace_id
    return None


def list_workspace_connectors(db: Session, workspace_id: str) -> List[Dict[str, Any]]:
    wid = uuid.UUID(str(workspace_id))
    rows = (
        db.query(WorkspaceIntegration)
        .filter(WorkspaceIntegration.workspace_id == wid)
        .all()
    )
    by_id = {r.connector_id: r for r in rows}

    output: List[Dict[str, Any]] = []
    for item in TOOL_CATALOG:
        cid = item["connector_id"]
        saved = by_id.get(cid)
        is_connected = bool(item["is_free_default"] or (saved and saved.is_connected))
        output.append(
            {
                **item,
                "is_connected": is_connected,
                "connected_email": saved.connected_email if saved else None,
                "mcp_url": saved.mcp_url if saved else None,
                "cached_tools": saved.cached_tools if saved else item["capabilities"],
                "updated_at": saved.updated_at.isoformat() if saved and saved.updated_at else None,
            }
        )

    # Also include any custom named MCP servers added beyond default ID
    known_ids = {i["connector_id"] for i in TOOL_CATALOG}
    for saved in rows:
        if saved.connector_id not in known_ids and saved.is_connected:
            output.append(
                {
                    "connector_id": saved.connector_id,
                    "name": saved.display_name,
                    "category": "Model Context Protocol",
                    "auth_type": saved.auth_type,
                    "is_free_default": False,
                    "requires_hitl": False,
                    "description": f"Custom MCP Server ({saved.mcp_url})",
                    "capabilities": saved.cached_tools or ["dynamic_mcp_tools"],
                    "fields": [],
                    "is_connected": True,
                    "connected_email": saved.connected_email,
                    "mcp_url": saved.mcp_url,
                    "cached_tools": saved.cached_tools or [],
                    "updated_at": saved.updated_at.isoformat() if saved.updated_at else None,
                }
            )
    return output


def save_api_or_mcp_connector(
    db: Session,
    workspace_id: str,
    connector_id: str,
    payload_data: Dict[str, Any],
    custom_name: Optional[str] = None,
) -> Dict[str, Any]:
    wid = uuid.UUID(str(workspace_id))
    catalog_item = get_catalog_item(connector_id)
    display_name = (
        custom_name.strip()
        if custom_name and custom_name.strip()
        else (catalog_item["name"] if catalog_item else connector_id)
    )
    auth_type = catalog_item["auth_type"] if catalog_item else "mcp_remote"

    mcp_url = (payload_data.get("mcp_url") or "").strip() or None
    if auth_type == "mcp_remote" and not mcp_url:
        raise ValueError("Remote MCP Server URL is required.")

    encrypted_creds = encrypt_api_key(json.dumps(payload_data)) if payload_data else None

    existing = (
        db.query(WorkspaceIntegration)
        .filter(
            WorkspaceIntegration.workspace_id == wid,
            WorkspaceIntegration.connector_id == connector_id,
        )
        .first()
    )

    if existing:
        existing.display_name = display_name
        existing.auth_type = auth_type
        if encrypted_creds:
            existing.encrypted_credentials = encrypted_creds
        if mcp_url:
            existing.mcp_url = mcp_url
        existing.is_connected = True
        db.commit()
        db.refresh(existing)
        record = existing
    else:
        record = WorkspaceIntegration(
            workspace_id=wid,
            connector_id=connector_id,
            display_name=display_name,
            auth_type=auth_type,
            encrypted_credentials=encrypted_creds,
            mcp_url=mcp_url,
            cached_tools=catalog_item["capabilities"] if catalog_item else ["dynamic_mcp_tools"],
            is_connected=True,
        )
        db.add(record)
        db.commit()
        db.refresh(record)

    return {
        "connector_id": record.connector_id,
        "display_name": record.display_name,
        "is_connected": record.is_connected,
        "mcp_url": record.mcp_url,
    }


def save_google_oauth_tokens(
    db: Session,
    workspace_id: str,
    access_token: str,
    refresh_token: Optional[str],
    expires_in: int,
    connected_email: Optional[str],
) -> None:
    wid = uuid.UUID(str(workspace_id))
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=max(int(expires_in or 3600) - 60, 60))

    existing = (
        db.query(WorkspaceIntegration)
        .filter(
            WorkspaceIntegration.workspace_id == wid,
            WorkspaceIntegration.connector_id == "google_workspace",
        )
        .first()
    )

    enc_access = encrypt_api_key(access_token)
    enc_refresh = encrypt_api_key(refresh_token) if refresh_token else None

    if existing:
        existing.encrypted_access_token = enc_access
        if enc_refresh:
            existing.encrypted_refresh_token = enc_refresh
        existing.token_expires_at = expires_at
        if connected_email:
            existing.connected_email = connected_email
        existing.is_connected = True
        existing.cached_tools = ["gmail_search", "gmail_send_email", "calendar_list_events", "calendar_create_event"]
    else:
        db.add(
            WorkspaceIntegration(
                workspace_id=wid,
                connector_id="google_workspace",
                display_name="Google Workspace (Gmail + Calendar)",
                auth_type="oauth2_google",
                encrypted_access_token=enc_access,
                encrypted_refresh_token=enc_refresh,
                token_expires_at=expires_at,
                connected_email=connected_email,
                cached_tools=["gmail_search", "gmail_send_email", "calendar_list_events", "calendar_create_event"],
                is_connected=True,
            )
        )
    db.commit()


def get_valid_google_access_token(db: Session, workspace_id: str) -> Optional[str]:
    wid = uuid.UUID(str(workspace_id))
    record = (
        db.query(WorkspaceIntegration)
        .filter(
            WorkspaceIntegration.workspace_id == wid,
            WorkspaceIntegration.connector_id == "google_workspace",
            WorkspaceIntegration.is_connected == True,
        )
        .first()
    )
    if not record or not record.encrypted_access_token:
        return None

    now = datetime.now(timezone.utc)
    if record.token_expires_at and record.token_expires_at > now:
        return decrypt_api_key(record.encrypted_access_token)

    # Refresh token flow if expired
    if not record.encrypted_refresh_token:
        return decrypt_api_key(record.encrypted_access_token)

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        return decrypt_api_key(record.encrypted_access_token)

    refresh_token = decrypt_api_key(record.encrypted_refresh_token)
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            resp.raise_for_status()
            token_data = resp.json()

        new_access = token_data.get("access_token")
        expires_in = int(token_data.get("expires_in", 3600))
        if new_access:
            record.encrypted_access_token = encrypt_api_key(new_access)
            record.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=max(expires_in - 60, 60))
            db.commit()
            return new_access
    except Exception:
        pass

    return decrypt_api_key(record.encrypted_access_token)


def disconnect_workspace_connector(db: Session, workspace_id: str, connector_id: str) -> bool:
    wid = uuid.UUID(str(workspace_id))
    record = (
        db.query(WorkspaceIntegration)
        .filter(
            WorkspaceIntegration.workspace_id == wid,
            WorkspaceIntegration.connector_id == connector_id,
        )
        .first()
    )
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True