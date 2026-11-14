from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session


def enforce_workspace_llm_access(
    db: Session,
    workspace_id: str,
    provider: str = "groq",
) -> dict:
    """
    1. If workspace is approved Full Manage -> allow platform .env key.
    2. If workspace is BYOK -> fetch workspace owner's encrypted_api_key from agent_configs
       so both Owner and invited Operators can chat without exposing the raw key.
    3. If BYOK and no key is saved -> block with HTTP 402.
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

    # 1. Look for matching provider key saved by Workspace Owner
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

    # 2. If Operator selected another model/provider, fallback to any active vault key in this workspace
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
        raise HTTPException(
            status_code=402,
            detail=(
                "BYOK Mode Active: Workspace Owner has not configured an API key yet. "
                "Please ask the Workspace Owner to add an API key in Settings -> Plan & AI Vault."
            ),
        )

    return {
        "mode": "byok",
        "encrypted_api_key": cfg_row.encrypted_api_key,
        "resolved_provider": (cfg_row.provider or clean_provider or "groq").strip().lower(),
    }