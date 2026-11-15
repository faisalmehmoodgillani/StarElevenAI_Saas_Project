import base64
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from langchain_core.tools import BaseTool, tool
from sqlalchemy.orm import Session

from backend.services.integration_vault import get_valid_google_access_token


def build_google_workspace_tools(db: Session, workspace_id: str) -> List[BaseTool]:
    """
    Creates tenant-scoped Gmail and Google Calendar tools bound strictly to `workspace_id`.
    Automatically refreshes expired OAuth access tokens via Supabase vault.
    """

    def _get_headers() -> Optional[dict]:
        token = get_valid_google_access_token(db, workspace_id)
        if not token:
            return None
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    @tool
    def gmail_search_emails(query: str = "is:inbox", max_results: int = 5) -> str:
        """
        Searches the workspace's connected Gmail inbox using standard Gmail search syntax
        (e.g., 'from:client@company.com', 'subject:proposal', 'is:unread') and returns summaries.
        """
        headers = _get_headers()
        if not headers:
            return "Google Workspace is not connected. Please connect Google Workspace in Agent Studio."

        limit = max(1, min(int(max_results or 5), 10))
        try:
            with httpx.Client(timeout=15.0) as client:
                list_resp = client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                    headers=headers,
                    params={"q": query or "is:inbox", "maxResults": limit},
                )
                list_resp.raise_for_status()
                messages = list_resp.json().get("messages", [])

                if not messages:
                    return f"No Gmail messages matched query: '{query}'."

                summaries = []
                for idx, msg in enumerate(messages, start=1):
                    detail = client.get(
                        f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                        headers=headers,
                        params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
                    )
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
    def gmail_send_email(to_email: str, subject: str, body: str) -> str:
        """
        Sends an email from the workspace's connected Gmail account.
        Requires Human-in-the-Loop (HITL) approval before execution.
        """
        headers = _get_headers()
        if not headers:
            return "Google Workspace is not connected. Please connect Google Workspace in Agent Studio."

        raw_mime = (
            f"To: {to_email.strip()}\r\n"
            f"Subject: {subject.strip()}\r\n"
            f'Content-Type: text/plain; charset="UTF-8"\r\n\r\n'
            f"{body}"
        )
        encoded = base64.urlsafe_b64encode(raw_mime.encode("utf-8")).decode("utf-8")

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(
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
    def calendar_list_events(max_results: int = 8) -> str:
        """
        Lists upcoming events from the workspace's connected primary Google Calendar
        to check availability before scheduling meetings.
        """
        headers = _get_headers()
        if not headers:
            return "Google Workspace is not connected. Please connect Google Workspace in Agent Studio."

        now_iso = datetime.now(timezone.utc).isoformat()
        limit = max(1, min(int(max_results or 8), 15))
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(
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
    def calendar_create_event(
        summary: str,
        start_iso: str,
        end_iso: str,
        attendee_email: str = "",
        description: str = "",
    ) -> str:
        """
        Books a new meeting/event on the workspace's primary Google Calendar.
        `start_iso` and `end_iso` must be ISO-8601 timestamps (e.g. '2026-11-16T15:00:00Z').
        Requires Human-in-the-Loop (HITL) approval before execution.
        """
        headers = _get_headers()
        if not headers:
            return "Google Workspace is not connected. Please connect Google Workspace in Agent Studio."

        event_body: dict = {
            "summary": summary.strip(),
            "description": description.strip(),
            "start": {"dateTime": start_iso.strip()},
            "end": {"dateTime": end_iso.strip()},
        }
        if attendee_email and "@" in attendee_email:
            event_body["attendees"] = [{"email": attendee_email.strip()}]

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(
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