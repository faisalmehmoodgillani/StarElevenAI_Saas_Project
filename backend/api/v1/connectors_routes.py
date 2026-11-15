import os
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.connection import get_db
from backend.services.integration_vault import (
    disconnect_workspace_connector,
    list_workspace_connectors,
    save_api_or_mcp_connector,
    save_google_oauth_tokens,
    sign_oauth_state,
    verify_oauth_state,
)

router = APIRouter(prefix="/connectors", tags=["Tool & MCP Connectors"])

GOOGLE_TOOL_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
]


class SaveConnectorRequest(BaseModel):
    workspace_id: str
    connector_id: str
    custom_name: Optional[str] = None
    credentials: Dict[str, Any]


@router.get("/catalog/{workspace_id}")
def get_connectors_catalog(workspace_id: str, db: Session = Depends(get_db)):
    """Returns full tool & MCP catalog with per-workspace connection status."""
    try:
        connectors = list_workspace_connectors(db, workspace_id)
        return {"workspace_id": workspace_id, "connectors": connectors}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load connectors: {str(e)}")


@router.post("/save")
def save_connector_from_ui(payload: SaveConnectorRequest, db: Session = Depends(get_db)):
    """Encrypts and saves API-key or Remote MCP connector settings from UI (Zero .env)."""
    try:
        result = save_api_or_mcp_connector(
            db=db,
            workspace_id=payload.workspace_id,
            connector_id=payload.connector_id,
            payload_data=payload.credentials,
            custom_name=payload.custom_name,
        )
        return {"status": "connected", "connector": result}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save connector: {str(e)}")


@router.delete("/{workspace_id}/{connector_id}")
def remove_connector(workspace_id: str, connector_id: str, db: Session = Depends(get_db)):
    """Disconnects and deletes encrypted credentials for a workspace connector."""
    removed = disconnect_workspace_connector(db, workspace_id, connector_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Connector not found or is a built-in free tool.")
    return {"status": "disconnected", "connector_id": connector_id}


@router.get("/google/connect")
def start_google_workspace_oauth(workspace_id: str = Query(...)):
    """
    1-Click Google Workspace OAuth starter (Gmail + Calendar).
    Works just like 'Continue with Google' login — non-technical users need zero API keys.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="Platform GOOGLE_CLIENT_ID is not configured in server environment.",
        )

    redirect_uri = os.getenv(
        "GOOGLE_TOOLS_REDIRECT_URI",
        "http://localhost:8000/api/v1/connectors/google/callback",
    )
    state_token = sign_oauth_state(workspace_id)

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_TOOL_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state_token,
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": auth_url}


@router.get("/google/callback")
def google_workspace_oauth_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Handles Google OAuth redirect, encrypts tokens with AES-256, and redirects back to /agents."""
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

    if error or not code or not state:
        return RedirectResponse(url=f"{frontend_url}/agents?oauth_error={error or 'cancelled'}")

    workspace_id = verify_oauth_state(state)
    if not workspace_id:
        return RedirectResponse(url=f"{frontend_url}/agents?oauth_error=invalid_state")

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv(
        "GOOGLE_TOOLS_REDIRECT_URI",
        "http://localhost:8000/api/v1/connectors/google/callback",
    )

    try:
        with httpx.Client(timeout=20.0) as client:
            token_resp = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            access_token = tokens.get("access_token")
            refresh_token = tokens.get("refresh_token")
            expires_in = int(tokens.get("expires_in", 3600))

            # Fetch connected Google email address
            user_email = None
            if access_token:
                info_resp = client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if info_resp.status_code == 200:
                    user_email = info_resp.json().get("email")

        if not access_token:
            return RedirectResponse(url=f"{frontend_url}/agents?oauth_error=missing_token")

        save_google_oauth_tokens(
            db=db,
            workspace_id=workspace_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            connected_email=user_email,
        )
        return RedirectResponse(url=f"{frontend_url}/agents?connected=google_workspace")
    except Exception:
        return RedirectResponse(url=f"{frontend_url}/agents?oauth_error=exchange_failed")