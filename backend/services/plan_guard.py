from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session


PLAN_TIER_LIMITS: dict[str, int] = {
    "byok_free": 0,
    "managed_starter": 2_000_000,
    "managed_growth": 10_000_000,
    "managed_enterprise": 35_000_000,
}


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
    1. If workspace is approved Managed -> enforce monthly token quota
       (tokens_used_this_month < monthly_token_limit) and allow platform keys.
    2. If workspace is BYOK -> fetch workspace owner's AES-256 encrypted_api_key
       from agent_configs so Owner and Operators can chat without exposing raw keys.
    3. If BYOK and no key is configured -> block with HTTP 402.
    """
    ws_row = db.execute(
        text(
            """
            SELECT
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                LOWER(COALESCE(plan_tier, 'byok_free')) AS plan_tier,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                billing_cycle_end
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
    plan_tier = ws_row.plan_tier
    managed_approved = bool(ws_row.managed_approved)
    token_limit = int(ws_row.monthly_token_limit or 0)
    tokens_used = int(ws_row.tokens_used_this_month or 0)
    cycle_end = ws_row.billing_cycle_end

    # Fully Managed enforcement (per-workspace isolated)
    if plan_mode == "managed" and managed_approved:
        now_utc = datetime.now(timezone.utc)

        # Auto-roll billing cycle if expired
        if cycle_end is not None and cycle_end <= now_utc:
            next_cycle = now_utc + timedelta(days=30)
            tokens_used = 0
            db.execute(
                text(
                    """
                    UPDATE workspaces
                    SET tokens_used_this_month = 0,
                        billing_cycle_end = :next_cycle
                    WHERE id = CAST(:wid AS UUID)
                    """
                ),
                {"wid": workspace_id, "next_cycle": next_cycle},
            )
            db.commit()

        effective_limit = token_limit if token_limit > 0 else PLAN_TIER_LIMITS.get(plan_tier, 2_000_000)

        if tokens_used >= effective_limit:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Monthly Token Quota Exceeded ({tokens_used:,} / {effective_limit:,} tokens used "
                    f"on {plan_tier.replace('_', ' ').title()}). Upgrade this workspace's plan on "
                    "/pricing or add your own API key in Settings -> Plan & AI Vault."
                ),
            )

        return {
            "mode": "managed",
            "plan_tier": plan_tier,
            "encrypted_api_key": None,
            "resolved_provider": (provider or "groq").strip().lower(),
            "monthly_token_limit": effective_limit,
            "tokens_used_this_month": tokens_used,
            "remaining_tokens": max(0, effective_limit - tokens_used),
        }

    # BYOK Vault enforcement (Module 06 frozen behavior)
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
                "Please add your API key in Settings -> Plan & AI Vault or upgrade to a Managed plan on /pricing."
            )
        else:
            detail_msg = (
                "BYOK Mode Active: The Workspace Owner has not configured an API key yet. "
                "Please ask your Workspace Owner to add an API key in Settings -> Plan & AI Vault."
            )
        raise HTTPException(status_code=402, detail=detail_msg)

    return {
        "mode": "byok",
        "plan_tier": "byok_free",
        "encrypted_api_key": cfg_row.encrypted_api_key,
        "resolved_provider": (cfg_row.provider or clean_provider or "groq").strip().lower(),
        "monthly_token_limit": 0,
        "tokens_used_this_month": tokens_used,
        "remaining_tokens": None,
    }


def record_workspace_token_usage(
    db: Session,
    workspace_id: str,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    total_tokens: Optional[int] = None,
    fallback_text: str = "",
) -> int:
    """
    Increments tokens_used_this_month for the given workspace_id after an LLM call.
    Uses exact token counts when supplied by the provider, or falls back to a ~4 chars/token estimate.
    """
    if total_tokens is not None and total_tokens > 0:
        delta = int(total_tokens)
    elif (prompt_tokens + completion_tokens) > 0:
        delta = int(prompt_tokens + completion_tokens)
    elif fallback_text:
        delta = max(1, len(fallback_text) // 4)
    else:
        return 0

    db.execute(
        text(
            """
            UPDATE workspaces
            SET tokens_used_this_month = COALESCE(tokens_used_this_month, 0) + :delta
            WHERE id = CAST(:wid AS UUID)
            """
        ),
        {"wid": workspace_id, "delta": delta},
    )
    db.commit()
    return delta