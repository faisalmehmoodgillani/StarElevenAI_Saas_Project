from typing import Optional
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session


def _is_workspace_owner_or_admin(
    db: Session,
    workspace_id: str,
    user_id: Optional[str],
) -> bool:
    """Checks whether the current sender is the Workspace Owner or an Admin."""
    if not user_id or not str(user_id).strip():
        return True

    clean_uid = str(user_id).strip()

    owner_row = db.execute(
        text(
            """
            SELECT LOWER(COALESCE(role, 'owner')) AS role
            FROM users
            WHERE workspace_id = CAST(:wid AS UUID)
              AND CAST(id AS TEXT) = :uid
            LIMIT 1
            """
        ),
        {"wid": workspace_id, "uid": clean_uid},
    ).fetchone()

    if owner_row:
        return owner_row.role in ("owner", "admin")

    member_row = db.execute(
        text(
            """
            SELECT LOWER(COALESCE(role, 'operator')) AS role
            FROM workspace_members
            WHERE workspace_id = CAST(:wid AS UUID)
              AND CAST(user_id AS TEXT) = :uid
            LIMIT 1
            """
        ),
        {"wid": workspace_id, "uid": clean_uid},
    ).fetchone()

    if member_row:
        return member_row.role in ("owner", "admin")

    return False


def enforce_workspace_llm_access(
    db: Session,
    workspace_id: str,
    provider: str = "groq",
    user_id: Optional[str] = None,
) -> dict:
    """
    1. If workspace is approved Full Manage -> allow platform .env key.
    2. If workspace is BYOK -> fetch workspace owner's encrypted_api_key from agent_configs
       so both Owner and invited Operators can chat without exposing the raw key.
    3. If BYOK and no key is saved -> block with HTTP 402 and role-aware guidance.
    """
    ws_row = db.execute(
        text(
            """
            SELECT
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                COALESCE(managed_approved, FALSE) AS managed_approved
            FROM workspaces
            WHERE id = CAST(:wid AS UUID)
            LIMIT 1
            """
        ),
        {"wid": workspace_id},
    ).fetchone()

    if not ws_row:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if ws_row.plan_mode == "managed" and bool(ws_row.managed_approved):
        return {
            "mode": "managed",
            "encrypted_api_key": None,
            "resolved_provider": (provider or "groq").strip().lower(),
        }

    clean_provider = (provider or "").strip().lower()

    cfg_row = db.execute(
        text(
            """
            SELECT provider, encrypted_api_key
            FROM agent_configs
            WHERE workspace_id = CAST(:wid AS UUID)
              AND encrypted_api_key IS NOT NULL
              AND TRIM(encrypted_api_key) <> ''
              AND (:prov = '' OR LOWER(provider) = :prov)
            ORDER BY id DESC
            LIMIT 1
            """
        ),
        {"wid": workspace_id, "prov": clean_provider},
    ).fetchone()

    if not cfg_row:
        cfg_row = db.execute(
            text(
                """
                SELECT provider, encrypted_api_key
                FROM agent_configs
                WHERE workspace_id = CAST(:wid AS UUID)
                  AND encrypted_api_key IS NOT NULL
                  AND TRIM(encrypted_api_key) <> ''
                ORDER BY id DESC
                LIMIT 1
                """
            ),
            {"wid": workspace_id},
        ).fetchone()

    if not cfg_row or not cfg_row.encrypted_api_key:
        is_owner = _is_workspace_owner_or_admin(db, workspace_id, user_id)
        if is_owner:
            detail_msg = (
                "BYOK Mode Active: Your workspace does not have an API key configured yet. "
                "Please add your API key in Settings -> Plan & AI Vault to start chatting."
            )
        else:
            detail_msg = (
                "BYOK Mode Active: The Workspace Owner has not configured an API key yet. "
                "Please ask your Workspace Owner to add an API key in Settings -> Plan & AI Vault."
            )
        raise HTTPException(status_code=402, detail=detail_msg)

    return {
        "mode": "byok",
        "encrypted_api_key": cfg_row.encrypted_api_key,
        "resolved_provider": (cfg_row.provider or clean_provider or "groq").strip().lower(),
    }