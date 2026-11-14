import logging
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def enforce_workspace_llm_access(
    db: Session,
    workspace_id: str,
    provider: str = "groq",
) -> dict:
    """
    Ensures BYOK workspaces cannot fall back to platform .env master keys
    unless a personal encrypted API key is saved in the vault.
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

    plan_mode = ws_row.plan_mode
    managed_approved = bool(ws_row.managed_approved)

    # Full Manage mode allowed only if approved
    if plan_mode == "managed" and managed_approved:
        return {"mode": "managed", "has_custom_key": False}

    clean_provider = (provider or "").strip().lower()
    has_key = False

    # 1. Check agent_configs table for saved encrypted key
    cfg_row = db.execute(
        text(
            """
            SELECT 1
            FROM agent_configs
            WHERE workspace_id = CAST(:wid AS UUID)
              AND encrypted_api_key IS NOT NULL
              AND TRIM(encrypted_api_key) <> ''
              AND (:prov = '' OR LOWER(provider) = :prov)
            LIMIT 1
            """
        ),
        {"wid": workspace_id, "prov": clean_provider},
    ).fetchone()

    if cfg_row:
        has_key = True

    # 2. Also check workspace_api_keys table if vault stores keys separately
    if not has_key:
        try:
            vault_row = db.execute(
                text(
                    """
                    SELECT 1
                    FROM workspace_api_keys
                    WHERE workspace_id = CAST(:wid AS UUID)
                      AND encrypted_key IS NOT NULL
                      AND TRIM(encrypted_key) <> ''
                      AND (:prov = '' OR LOWER(provider) = :prov)
                    LIMIT 1
                    """
                ),
                {"wid": workspace_id, "prov": clean_provider},
            ).fetchone()
            if vault_row:
                has_key = True
        except Exception:
            db.rollback()

    if not has_key:
        raise HTTPException(
            status_code=402,
            detail=(
                f"BYOK Mode Active: No API key configured for '{clean_provider or 'selected provider'}'. "
                "Please save your API key in Settings -> Plan & AI Vault or request Full Manage access."
            ),
        )

    return {"mode": "byok", "has_custom_key": True}