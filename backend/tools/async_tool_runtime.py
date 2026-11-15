import asyncio
import base64
import html
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

import httpx
from langchain_core.tools import BaseTool, tool
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.models import WorkspaceIntegration
from backend.services.integration_vault import TOOL_CATALOG, get_valid_google_access_token
from backend.services.security import decrypt_api_key

FREE_DEFAULT_CONNECTOR_IDS: Set[str] = {
    item["connector_id"] for item in TOOL_CATALOG if item.get("is_free_default")
}

HITL_SENSITIVE_TOOL_NAMES: Set[str] = {
    "gmail_send_email",
    "calendar_create_event",
    "slack_post_message",
    "whatsapp_send_message",
}


@tool
async def async_duckduckgo_search(query: str) -> str:
    """
    Searches the live web asynchronously using DuckDuckGo for market research,
    competitor insights, company details, and current news.
    """
    clean_query = (query or "").strip()
    if not clean_query:
        return "Search query cannot be empty."

    def _run_ddg() -> str:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        results = []
        with DDGS() as ddgs:
            for item in ddgs.text(clean_query, max_results=5):
                results.append(item)

        if not results:
            return f"No live web results found for: '{clean_query}'."

        formatted = []
        for idx, item in enumerate(results, start=1):
            title = item.get("title", "Untitled")
            href = item.get("href") or item.get("url", "")
            body = item.get("body") or item.get("snippet", "")
            formatted.append(f"{idx}. {title}\nURL: {href}\nSummary: {body}")
        return "\n\n".join(formatted)

    try:
        return await asyncio.to_thread(_run_ddg)
    except Exception as e:
        return f"DuckDuckGo search error: {str(e)}"


@tool
async def async_scrape_webpage(url: str) -> str:
    """
    Asynchronously fetches and extracts clean text, page title, and public contact emails
    from any webpage URL for lead research, website audits, or competitor analysis.
    """
    target_url = (url or "").strip()
    if not target_url:
        return "Please provide a valid URL to scrape."
    if not target_url.startswith(("http://", "https://")):
        target_url = f"https://{target_url}"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(target_url, headers=headers)
            resp.raise_for_status()
            raw_html = resp.text

        title_match = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.IGNORECASE | re.DOTALL)
        page_title = (
            html.unescape(re.sub(r"\s+", " ", title_match.group(1))).strip()
            if title_match
            else "No Title"
        )

        emails = sorted(
            set(re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", raw_html))
        )
        filtered_emails = [
            e
            for e in emails
            if not e.lower().endswith((".png", ".jpg", ".jpeg", ".svg", ".webp", ".css", ".js"))
        ][:8]

        cleaned = re.sub(
            r"<(script|style|noscript|svg)[^>]*>.*?</\1>",
            " ",
            raw_html,
            flags=re.IGNORECASE | re.DOTALL,
        )
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)
        cleaned = html.unescape(cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        excerpt = cleaned[:4000]
        email_line = ", ".join(filtered_emails) if filtered_emails else "None found"
        return (
            f"URL: {target_url}\n"
            f"Title: {page_title}\n"
            f"Public Emails Found: {email_line}\n\n"
            f"Extracted Content:\n{excerpt}"
        )
    except Exception as e:
        return f"Failed to scrape '{target_url}': {str(e)}"


def _build_async_crm_tools(db: Session, workspace_id: str) -> List[BaseTool]:
    @tool
    async def workspace_crm_lookup(search_term: str = "") -> str:
        """Queries tenant-isolated workspace bookings, leads, and operational summary records."""

        def _query() -> str:
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

        try:
            return await asyncio.to_thread(_query)
        except Exception as e:
            return f"CRM lookup note: {str(e)}"

    return [workspace_crm_lookup]


def _build_async_google_tools(db: Session, workspace_id: str) -> List[BaseTool]:
    async def _get_headers() -> Optional[dict]:
        token = await asyncio.to_thread(get_valid_google_access_token, db, workspace_id)
        if not token:
            return None
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @tool
    async def gmail_search_emails(query: str = "is:inbox", max_results: int = 5) -> str:
        """Searches the workspace's connected Gmail inbox asynchronously and returns email summaries."""
        headers = await _get_headers()
        if not headers:
            return "Google Workspace is not connected."

        limit = max(1, min(int(max_results or 5), 10))
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                list_resp = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                    headers=headers,
                    params={"q": query or "is:inbox", "maxResults": limit},
                )
                list_resp.raise_for_status()
                messages = list_resp.json().get("messages", [])
                if not messages:
                    return f"No Gmail messages matched query: '{query}'."

                async def _fetch_msg(msg_id: str):
                    return await client.get(
                        f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
                        headers=headers,
                        params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                    )

                details = await asyncio.gather(*[_fetch_msg(m["id"]) for m in messages])
                summaries = []
                for idx, detail in enumerate(details, start=1):
                    if detail.status_code != 200:
                        continue
                    data = detail.json()
                    hdrs = {
                        h["name"]: h["value"]
                        for h in data.get("payload", {}).get("headers", [])
                    }
                    summaries.append(
                        f"{idx}. Subject: {hdrs.get('Subject', '(No Subject)')}\n"
                        f"   From: {hdrs.get('From', 'Unknown')} | Date: {hdrs.get('Date', '')}\n"
                        f"   Snippet: {data.get('snippet', '')}"
                    )
                return "\n\n".join(summaries) if summaries else "No readable email details found."
        except Exception as e:
            return f"Gmail search error: {str(e)}"

    @tool
    async def gmail_send_email(to_email: str, subject: str, body: str) -> str:
        """Sends an email from the workspace's connected Gmail account (HITL approval gated)."""
        headers = await _get_headers()
        if not headers:
            return "Google Workspace is not connected."

        raw_mime = (
            f"To: {to_email.strip()}\r\n"
            f"Subject: {subject.strip()}\r\n"
            f'Content-Type: text/plain; charset="UTF-8"\r\n\r\n'
            f"{body}"
        )
        encoded = base64.urlsafe_b64encode(raw_mime.encode("utf-8")).decode("utf-8")

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    headers=headers,
                    json={"raw": encoded},
                )
                resp.raise_for_status()
                sent_id = resp.json().get("id", "sent")
                return f"Email successfully sent to {to_email} (Message ID: {sent_id})."
        except Exception as e:
            return f"Failed to send Gmail message: {str(e)}"

    @tool
    async def calendar_list_events(max_results: int = 8) -> str:
        """Lists upcoming events from the workspace's primary Google Calendar asynchronously."""
        headers = await _get_headers()
        if not headers:
            return "Google Workspace is not connected."

        now_iso = datetime.now(timezone.utc).isoformat()
        limit = max(1, min(int(max_results or 8), 15))
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers=headers,
                    params={
                        "timeMin": now_iso,
                        "maxResults": limit,
                        "singleEvents": "true",
                        "orderBy": "startTime",
                    },
                )
                resp.raise_for_status()
                items = resp.json().get("items", [])
                if not items:
                    return "No upcoming events found on primary Google Calendar."

                lines = []
                for idx, ev in enumerate(items, start=1):
                    start = ev.get("start", {}).get("dateTime") or ev.get("start", {}).get("date", "")
                    end = ev.get("end", {}).get("dateTime") or ev.get("end", {}).get("date", "")
                    lines.append(f"{idx}. {ev.get('summary', 'Busy')} | {start} -> {end}")
                return "\n".join(lines)
        except Exception as e:
            return f"Google Calendar list error: {str(e)}"

    @tool
    async def calendar_create_event(
        summary: str,
        start_iso: str,
        end_iso: str,
        attendee_email: str = "",
        description: str = "",
    ) -> str:
        """Books a new event on the workspace's primary Google Calendar (HITL approval gated)."""
        headers = await _get_headers()
        if not headers:
            return "Google Workspace is not connected."

        event_body: dict = {
            "summary": summary.strip(),
            "description": description.strip(),
            "start": {"dateTime": start_iso.strip()},
            "end": {"dateTime": end_iso.strip()},
        }
        if attendee_email and "@" in attendee_email:
            event_body["attendees"] = [{"email": attendee_email.strip()}]

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers=headers,
                    json=event_body,
                )
                resp.raise_for_status()
                created = resp.json()
                return (
                    f"Calendar event booked: '{created.get('summary')}' "
                    f"({start_iso} to {end_iso}). Link: {created.get('htmlLink', 'Created')}"
                )
        except Exception as e:
            return f"Failed to create Google Calendar event: {str(e)}"

    return [
        gmail_search_emails,
        gmail_send_email,
        calendar_list_events,
        calendar_create_event,
    ]


def _build_async_api_connector_tools(row: WorkspaceIntegration) -> List[BaseTool]:
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
        async def tavily_deep_search(query: str) -> str:
            """Performs deep AI-optimized web research asynchronously via Tavily API."""
            if not api_key:
                return "Tavily API key is missing."
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.post(
                        "https://api.tavily.com/search",
                        json={
                            "api_key": api_key,
                            "query": query,
                            "search_depth": "advanced",
                            "max_results": 5,
                        },
                    )
                    resp.raise_for_status()
                    results = resp.json().get("results", [])
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
        async def slack_post_message(message: str) -> str:
            """Posts an alert or summary to the workspace's Slack channel (HITL approval gated)."""
            if not webhook_url:
                return "Slack Webhook URL is missing."
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(webhook_url, json={"text": message})
                    resp.raise_for_status()
                return "Slack notification posted successfully."
            except Exception as e:
                return f"Slack webhook error: {str(e)}"

        return [slack_post_message]

    if cid == "whatsapp_cloud":
        access_token = (creds.get("access_token") or "").strip()
        phone_number_id = (creds.get("phone_number_id") or "").strip()

        @tool
        async def whatsapp_send_message(recipient_phone: str, message_text: str) -> str:
            """Sends a WhatsApp message via Meta Cloud API (HITL approval gated)."""
            if not access_token or not phone_number_id:
                return "WhatsApp Cloud credentials are incomplete."
            clean_phone = "".join(ch for ch in recipient_phone if ch.isdigit())
            url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
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


async def _load_async_mcp_tools(integrations: List[WorkspaceIntegration]) -> List[BaseTool]:
    """Asynchronously connects ONLY to the pinned Remote MCP servers for this chat."""
    server_map: Dict[str, Dict[str, Any]] = {}
    for row in integrations:
        if row.is_connected and row.mcp_url:
            clean_url = row.mcp_url.strip()
            transport = (
                "sse"
                if clean_url.endswith("/sse") or "sse" in clean_url.lower()
                else "streamable_http"
            )
            cfg: Dict[str, Any] = {"transport": transport, "url": clean_url}
            if row.encrypted_credentials:
                try:
                    creds = json.loads(decrypt_api_key(row.encrypted_credentials))
                    bearer = (creds.get("bearer_token") or creds.get("api_key") or "").strip()
                    if bearer:
                        cfg["headers"] = {"Authorization": f"Bearer {bearer}"}
                except Exception:
                    pass
            server_map[row.connector_id] = cfg

    if not server_map:
        return []

    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient

        client = MultiServerMCPClient(server_map)
        return await client.get_tools()
    except Exception:
        return []


async def build_async_scoped_tools(
    db: Session,
    workspace_id: str,
    requested_connector_ids: List[str],
) -> Dict[str, Any]:
    """
    Lazy-loads and decrypts ONLY the exact connector IDs pinned/bound in this chat session.
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
        db_rows = await asyncio.to_thread(
            lambda: db.query(WorkspaceIntegration)
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
    mcp_rows: List[WorkspaceIntegration] = []

    for cid in unique_ids:
        if cid == "duckduckgo_search":
            resolved_tools.append(async_duckduckgo_search)
        elif cid == "web_scraper":
            resolved_tools.append(async_scrape_webpage)
        elif cid == "workspace_crm":
            resolved_tools.extend(_build_async_crm_tools(db, workspace_id))
        elif cid == "google_workspace":
            if cid not in connected_map:
                missing_connectors.append(cid)
            else:
                resolved_tools.extend(_build_async_google_tools(db, workspace_id))
        else:
            row = connected_map.get(cid)
            if not row:
                missing_connectors.append(cid)
            elif row.auth_type == "mcp_remote":
                mcp_rows.append(row)
            else:
                resolved_tools.extend(_build_async_api_connector_tools(row))

    if mcp_rows:
        mcp_tools = await _load_async_mcp_tools(mcp_rows)
        resolved_tools.extend(mcp_tools)

    hitl_tools = [t.name for t in resolved_tools if t.name in HITL_SENSITIVE_TOOL_NAMES]
    return {
        "tools": resolved_tools,
        "missing_connectors": missing_connectors,
        "hitl_tools": hitl_tools,
    }