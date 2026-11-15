import json
import uuid
from typing import Any, Dict, List, Set

import httpx
from langchain_core.tools import BaseTool, tool
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.models import WorkspaceIntegration
from backend.mcp.client_manager import load_mcp_tools_for_integrations
from backend.services.integration_vault import TOOL_CATALOG
from backend.services.security import decrypt_api_key
from backend.tools.google_tools import build_google_workspace_tools
from backend.tools.web_scraper import scrape_webpage_content
from backend.tools.web_search import duckduckgo_web_search

FREE_DEFAULT_CONNECTOR_IDS: Set[str] = {
    item["connector_id"] for item in TOOL_CATALOG if item.get("is_free_default")
}

# Sensitive external actions that trigger LangGraph HITL interrupt() before execution
HITL_SENSITIVE_TOOL_NAMES: Set[str] = {
    "gmail_send_email",
    "calendar_create_event",
    "slack_post_message",
    "whatsapp_send_message",
}


def _build_tenant_crm_tools(db: Session, workspace_id: str) -> List[BaseTool]:
    """Tenant-scoped CRM lookup & workspace summary tools."""

    @tool
    def workspace_crm_lookup(search_term: str = "") -> str:
        """
        Queries tenant-isolated workspace bookings, leads, and workspace summary records.
        """
        try:
            row = db.execute(
                text(
                    """
                    SELECT name, slug, industry, plan_tier
                    FROM workspaces
                    WHERE id = CAST(:wid AS UUID)
                    LIMIT 1
                    """
                ),
                {"wid": workspace_id},
            ).fetchone()

            ws_info = (
                f"Workspace: {row.name} (/{row.slug}) | Industry: {row.industry} | Plan: {row.plan_tier}"
                if row
                else f"Workspace ID: {workspace_id}"
            )

            bookings = db.execute(
                text(
                    """
                    SELECT full_name, email, company_name, booking_date, time_slot, status
                    FROM call_bookings
                    ORDER BY created_at DESC
                    LIMIT 5
                    """
                )
            ).fetchall()

            if not bookings:
                return f"{ws_info}\nNo recent inbound booking leads recorded yet."

            lead_lines = [
                f"- {b.full_name} ({b.email}) | Company: {b.company_name or 'N/A'} | Slot: {b.booking_date} {b.time_slot} [{b.status}]"
                for b in bookings
            ]
            return f"{ws_info}\nRecent Pipeline Leads:\n" + "\n".join(lead_lines)
        except Exception as e:
            return f"CRM lookup note: {str(e)}"

    return [workspace_crm_lookup]


def _build_api_connector_tools(row: WorkspaceIntegration) -> List[BaseTool]:
    """Decrypts credentials for a single requested API connector and returns its tools."""
    creds: Dict[str, Any] = {}
    if row.encrypted_credentials:
        try:
            creds = json.loads(decrypt_api_key(row.encrypted_credentials))
        except Exception:
            creds = {}

    cid = row.connector_id

    if cid == "tavily_search":
        api_key = (creds.get("api_key") or "").strip()

        @tool
        def tavily_deep_search(query: str) -> str:
            """Performs deep AI-optimized web research using the workspace's Tavily API key."""
            if not api_key:
                return "Tavily API key is missing in workspace vault."
            try:
                from tavily import TavilyClient

                client = TavilyClient(api_key=api_key)
                resp = client.search(query=query, search_depth="advanced", max_results=5)
                results = resp.get("results", [])
                if not results:
                    return f"No Tavily results for '{query}'."
                return "\n\n".join(
                    f"{i}. {r.get('title', '')}\nURL: {r.get('url', '')}\nSummary: {r.get('content', '')}"
                    for i, r in enumerate(results, start=1)
                )
            except Exception as e:
                return f"Tavily search error: {str(e)}"

        return [tavily_deep_search]

    if cid == "slack_webhook":
        webhook_url = (creds.get("webhook_url") or "").strip()

        @tool
        def slack_post_message(message: str) -> str:
            """Posts a notification or summary alert to the workspace's configured Slack channel."""
            if not webhook_url:
                return "Slack Webhook URL is missing."
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(webhook_url, json={"text": message})
                    resp.raise_for_status()
                return "Slack notification posted successfully."
            except Exception as e:
                return f"Slack webhook error: {str(e)}"

        return [slack_post_message]

    if cid == "whatsapp_cloud":
        access_token = (creds.get("access_token") or "").strip()
        phone_number_id = (creds.get("phone_number_id") or "").strip()

        @tool
        def whatsapp_send_message(recipient_phone: str, message_text: str) -> str:
            """Sends a WhatsApp message via Meta WhatsApp Cloud API (requires E.164 phone number)."""
            if not access_token or not phone_number_id:
                return "WhatsApp Cloud credentials are incomplete."
            clean_phone = "".join(ch for ch in recipient_phone if ch.isdigit())
            url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
            try:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(
                        url,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "messaging_product": "whatsapp",
                            "to": clean_phone,
                            "type": "text",
                            "text": {"body": message_text},
                        },
                    )
                    resp.raise_for_status()
                return f"WhatsApp message sent to +{clean_phone}."
            except Exception as e:
                return f"WhatsApp Cloud API error: {str(e)}"

        return [whatsapp_send_message]

    return []


def build_scoped_tools_for_workspace(
    db: Session,
    workspace_id: str,
    requested_connector_ids: List[str],
) -> Dict[str, Any]:
    """
    Strictly lazy-loads ONLY the requested/pinned connector IDs for this workspace.
    Even if 100 tools/MCPs are connected in DB, only the 1-3 requested IDs are queried & instantiated.
    """
    unique_ids: List[str] = []
    for cid in requested_connector_ids:
        clean = (cid or "").strip()
        if clean and clean not in unique_ids:
            unique_ids.append(clean)

    if not unique_ids:
        return {"tools": [], "missing_connectors": [], "hitl_tools": []}

    wid = uuid.UUID(str(workspace_id))
    non_free_ids = [cid for cid in unique_ids if cid not in FREE_DEFAULT_CONNECTOR_IDS]

    db_rows: List[WorkspaceIntegration] = []
    if non_free_ids:
        db_rows = (
            db.query(WorkspaceIntegration)
            .filter(
                WorkspaceIntegration.workspace_id == wid,
                WorkspaceIntegration.connector_id.in_(non_free_ids),
                WorkspaceIntegration.is_connected == True,
            )
            .all()
        )
    connected_map = {r.connector_id: r for r in db_rows}

    resolved_tools: List[BaseTool] = []
    missing_connectors: List[str] = []
    mcp_rows_to_load: List[WorkspaceIntegration] = []

    for cid in unique_ids:
        if cid == "duckduckgo_search":
            resolved_tools.append(duckduckgo_web_search)
        elif cid == "web_scraper":
            resolved_tools.append(scrape_webpage_content)
        elif cid == "workspace_crm":
            resolved_tools.extend(_build_tenant_crm_tools(db, workspace_id))
        elif cid == "google_workspace":
            if cid not in connected_map:
                missing_connectors.append(cid)
            else:
                resolved_tools.extend(build_google_workspace_tools(db, workspace_id))
        else:
            row = connected_map.get(cid)
            if not row:
                missing_connectors.append(cid)
            elif row.auth_type == "mcp_remote":
                mcp_rows_to_load.append(row)
            else:
                resolved_tools.extend(_build_api_connector_tools(row))

    if mcp_rows_to_load:
        resolved_tools.extend(load_mcp_tools_for_integrations(mcp_rows_to_load))

    hitl_tools = [t.name for t in resolved_tools if t.name in HITL_SENSITIVE_TOOL_NAMES]

    return {
        "tools": resolved_tools,
        "missing_connectors": missing_connectors,
        "hitl_tools": hitl_tools,
    }