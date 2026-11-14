import os
import re
import smtplib
import logging
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.connection import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces", tags=["Workspaces & Billing"])

VALID_INDUSTRIES = {
    "agency",
    "real_estate",
    "ecommerce",
    "healthcare",
    "education",
    "saas",
    "other",
}

PLAN_CATALOG: Dict[str, Dict[str, Any]] = {
    "byok_free": {
        "label": "BYOK Free",
        "mode": "byok",
        "monthly_price": 0,
        "annual_price": 0,
        "monthly_token_limit": 0,
    },
    "managed_starter": {
        "label": "Managed Starter",
        "mode": "managed",
        "monthly_price": 49,
        "annual_price": 39,
        "monthly_token_limit": 2_000_000,
    },
    "managed_growth": {
        "label": "Managed Growth",
        "mode": "managed",
        "monthly_price": 149,
        "annual_price": 119,
        "monthly_token_limit": 10_000_000,
    },
    "managed_enterprise": {
        "label": "Managed Agency",
        "mode": "managed",
        "monthly_price": 399,
        "annual_price": 319,
        "monthly_token_limit": 35_000_000,
    },
}


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", "-", value.lower().strip()).strip("-")
    return cleaned or f"workspace-{int(datetime.now().timestamp())}"


def _normalize_industry(raw: Optional[str]) -> str:
    if not raw:
        return "agency"
    val = raw.strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "marketing_agency": "agency",
        "general_b2b": "saas",
        "general": "other",
        "e_commerce": "ecommerce",
    }
    mapped = aliases.get(val, val)
    return mapped if mapped in VALID_INDUSTRIES else "other"


def _is_super_admin(email: Optional[str]) -> bool:
    if not email:
        return False
    raw_admins = os.getenv("SUPER_ADMIN_EMAILS", "")
    admin_list = [e.strip().lower() for e in raw_admins.split(",") if e.strip()]
    return email.strip().lower() in admin_list


def _send_managed_upgrade_alert(
    workspace_id: str,
    workspace_name: str,
    requester_email: str,
    requested_tier: str,
    billing_interval: str,
) -> bool:
    """Sends instant Gmail SMTP alert to SUPER_ADMIN_EMAILS when a workspace requests a Managed tier."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    raw_admins = os.getenv("SUPER_ADMIN_EMAILS", "").strip()

    recipients = [e.strip() for e in raw_admins.split(",") if e.strip()]
    if not smtp_user or not smtp_password or not recipients:
        logger.info("SMTP or SUPER_ADMIN_EMAILS not configured; skipping upgrade alert email.")
        return False

    plan_info = PLAN_CATALOG.get(requested_tier, PLAN_CATALOG["managed_starter"])
    price = (
        plan_info["annual_price"]
        if billing_interval == "annual"
        else plan_info["monthly_price"]
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[StarEleven AI] Managed Plan Upgrade Request: {workspace_name} ({plan_info['label']})"
    msg["From"] = smtp_user
    msg["To"] = ", ".join(recipients)

    body = (
        f"New Per-Workspace Managed Plan Upgrade Request\n"
        f"----------------------------------------------\n"
        f"Workspace Name : {workspace_name}\n"
        f"Workspace ID   : {workspace_id}\n"
        f"Requester      : {requester_email}\n"
        f"Requested Tier : {plan_info['label']} ({requested_tier})\n"
        f"Billing Cycle  : {billing_interval.title()} (${price}/mo)\n"
        f"Token Quota    : {plan_info['monthly_token_limit']:,} tokens / month\n\n"
        f"Approve via POST /api/v1/workspaces/{workspace_id}/approve-managed\n"
    )
    msg.attach(MIMEText(body, "plain"))

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, recipients, msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, recipients, msg.as_string())
        return True
    except Exception as exc:
        logger.warning("Failed to send Managed Plan upgrade email: %s", exc)
        return False


def _serialize_workspace(row: Any) -> Dict[str, Any]:
    limit = int(row.monthly_token_limit or 0)
    used = int(row.tokens_used_this_month or 0)
    remaining = max(0, limit - used) if limit > 0 else None
    usage_pct = round(min(100.0, (used / limit) * 100), 1) if limit > 0 else 0.0

    return {
        "id": str(row.id),
        "workspace_id": str(row.id),
        "name": row.name,
        "slug": row.slug,
        "is_active": bool(row.is_active),
        "plan_mode": row.plan_mode or "byok",
        "plan_tier": row.plan_tier or "byok_free",
        "requested_plan_tier": row.requested_plan_tier,
        "billing_interval": row.billing_interval or "monthly",
        "managed_approved": bool(row.managed_approved),
        "managed_request_status": row.managed_request_status or "none",
        "monthly_token_limit": limit,
        "tokens_used_this_month": used,
        "remaining_tokens": remaining,
        "usage_percent": usage_pct,
        "billing_cycle_end": (
            row.billing_cycle_end.isoformat() if row.billing_cycle_end else None
        ),
        "industry": row.industry or "agency",
        "industry_config": row.industry_config or {},
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: Optional[str] = None
    owner_email: Optional[str] = None
    admin_full_name: Optional[str] = None
    industry: Optional[str] = "agency"
    plan_mode: Optional[str] = "byok"
    plan_tier: Optional[str] = "byok_free"
    billing_interval: Optional[str] = "monthly"


class WorkspaceUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    industry: Optional[str] = None
    industry_config: Optional[Dict[str, Any]] = None
    plan_mode: Optional[str] = None
    plan_tier: Optional[str] = None
    billing_interval: Optional[str] = None
    requester_email: Optional[str] = None


class WorkspacePlanUpgradeRequest(BaseModel):
    plan_tier: str = Field(
        ...,
        description="byok_free | managed_starter | managed_growth | managed_enterprise",
    )
    billing_interval: str = Field(default="monthly", description="monthly | annual")
    requester_email: Optional[str] = None


class ApproveManagedRequest(BaseModel):
    admin_email: str
    plan_tier: Optional[str] = None
    billing_interval: Optional[str] = None


@router.get("")
async def list_workspaces(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT
                id, name, slug, is_active,
                COALESCE(plan_mode, 'byok') AS plan_mode,
                COALESCE(plan_tier, 'byok_free') AS plan_tier,
                requested_plan_tier,
                COALESCE(billing_interval, 'monthly') AS billing_interval,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                COALESCE(managed_request_status, 'none') AS managed_request_status,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                billing_cycle_end,
                COALESCE(industry, 'agency') AS industry,
                COALESCE(industry_config, '{}'::jsonb) AS industry_config,
                created_at
            FROM workspaces
            ORDER BY created_at ASC
            """
        )
    ).fetchall()

    return {"workspaces": [_serialize_workspace(r) for r in rows]}


@router.post("")
async def create_workspace(
    payload: WorkspaceCreateRequest,
    db: Session = Depends(get_db),
):
    clean_name = payload.name.strip()
    base_slug = _slugify(payload.slug or clean_name)
    industry = _normalize_industry(payload.industry)
    interval = "annual" if (payload.billing_interval or "").lower() == "annual" else "monthly"

    # Ensure unique slug
    existing_slug = db.execute(
        text("SELECT 1 FROM workspaces WHERE slug = :slug LIMIT 1"),
        {"slug": base_slug},
    ).fetchone()
    final_slug = (
        f"{base_slug}-{int(datetime.now().timestamp()) % 10000}"
        if existing_slug
        else base_slug
    )

    requested_tier = (payload.plan_tier or "byok_free").strip().lower()
    if requested_tier not in PLAN_CATALOG:
        requested_tier = "byok_free"

    wants_managed = (
        requested_tier.startswith("managed_")
        or (payload.plan_mode or "").strip().lower() == "managed"
    )
    if wants_managed and requested_tier == "byok_free":
        requested_tier = "managed_starter"

    super_admin = _is_super_admin(payload.owner_email)
    
    owned_count = 0
    if payload.owner_email:
        owner_email_clean = payload.owner_email.strip().lower()
        count_row = db.execute(
            text(
                """
                SELECT COUNT(DISTINCT workspace_id) AS cnt
                FROM (
                    SELECT workspace_id FROM workspace_members
                    WHERE LOWER(user_email) = :email AND LOWER(COALESCE(role, 'owner')) = 'owner'
                    UNION
                    SELECT workspace_id FROM users
                    WHERE LOWER(email) = :email AND LOWER(COALESCE(role, 'owner')) = 'owner'
                ) t
                """
            ),
            {"email": owner_email_clean},
        ).fetchone()
        owned_count = int(count_row.cnt or 0) if count_row else 0

    if owned_count >= 1 and not super_admin:
        raise HTTPException(
            status_code=402,
            detail=(
                "BYOK Free Plan allows 1 workspace per account. "
                "Upgrade to a Managed Plan on /pricing to create additional client workspaces."
            ),
        )

    # Per-workspace billing rule:
    # BYOK workspaces are created freely; Managed workspaces require separate approval unless super admin.
    if wants_managed and super_admin:
        plan_mode = "managed"
        plan_tier = requested_tier
        managed_approved = True
        managed_request_status = "approved"
        requested_plan_tier = None
        token_limit = PLAN_CATALOG[plan_tier]["monthly_token_limit"]
        cycle_end = datetime.now(timezone.utc) + timedelta(days=30)
    elif wants_managed:
        plan_mode = "byok"
        plan_tier = "byok_free"
        managed_approved = False
        managed_request_status = "pending"
        requested_plan_tier = requested_tier
        token_limit = 0
        cycle_end = None
    else:
        plan_mode = "byok"
        plan_tier = "byok_free"
        managed_approved = False
        managed_request_status = "none"
        requested_plan_tier = None
        token_limit = 0
        cycle_end = None

    row = db.execute(
        text(
            """
            INSERT INTO workspaces (
                name, slug, is_active, plan_mode, plan_tier,
                requested_plan_tier, billing_interval,
                managed_approved, managed_request_status,
                monthly_token_limit, tokens_used_this_month,
                billing_cycle_end, industry, industry_config
            )
            VALUES (
                :name, :slug, TRUE, :plan_mode, :plan_tier,
                :requested_plan_tier, :billing_interval,
                :managed_approved, :managed_request_status,
                :monthly_token_limit, 0,
                :billing_cycle_end, :industry, '{}'::jsonb
            )
            RETURNING
                id, name, slug, is_active, plan_mode, plan_tier,
                requested_plan_tier, billing_interval,
                managed_approved, managed_request_status,
                monthly_token_limit, tokens_used_this_month,
                billing_cycle_end, industry, industry_config, created_at
            """
        ),
        {
            "name": clean_name,
            "slug": final_slug,
            "plan_mode": plan_mode,
            "plan_tier": plan_tier,
            "requested_plan_tier": requested_plan_tier,
            "billing_interval": interval,
            "managed_approved": managed_approved,
            "managed_request_status": managed_request_status,
            "monthly_token_limit": token_limit,
            "billing_cycle_end": cycle_end,
            "industry": industry,
        },
    ).fetchone()

    workspace_id = str(row.id)

    # Link owner in workspace_members if owner_email is supplied
    if payload.owner_email:
        owner_email = payload.owner_email.strip().lower()
        db.execute(
            text(
                """
                INSERT INTO workspace_members (workspace_id, user_email, role)
                VALUES (CAST(:wid AS UUID), :email, 'owner')
                ON CONFLICT (workspace_id, user_email) DO NOTHING
                """
            ),
            {"wid": workspace_id, "email": owner_email},
        )

    db.commit()

    if wants_managed and not super_admin and payload.owner_email:
        _send_managed_upgrade_alert(
            workspace_id=workspace_id,
            workspace_name=clean_name,
            requester_email=payload.owner_email.strip().lower(),
            requested_tier=requested_tier,
            billing_interval=interval,
        )

    return _serialize_workspace(row)


@router.get("/{workspace_id}/billing")
async def get_workspace_billing(workspace_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text(
            """
            SELECT
                id, name, slug, is_active,
                COALESCE(plan_mode, 'byok') AS plan_mode,
                COALESCE(plan_tier, 'byok_free') AS plan_tier,
                requested_plan_tier,
                COALESCE(billing_interval, 'monthly') AS billing_interval,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                COALESCE(managed_request_status, 'none') AS managed_request_status,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                billing_cycle_end,
                COALESCE(industry, 'agency') AS industry,
                COALESCE(industry_config, '{}'::jsonb) AS industry_config,
                created_at
            FROM workspaces
            WHERE id = CAST(:wid AS UUID)
            LIMIT 1
            """
        ),
        {"wid": workspace_id},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    return {
        "workspace": _serialize_workspace(row),
        "plans": PLAN_CATALOG,
    }


@router.post("/{workspace_id}/plan-upgrade")
async def request_or_activate_workspace_plan(
    workspace_id: str,
    payload: WorkspacePlanUpgradeRequest,
    db: Session = Depends(get_db),
):
    target_tier = payload.plan_tier.strip().lower()
    if target_tier not in PLAN_CATALOG:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan_tier '{target_tier}'. Must be one of: {', '.join(PLAN_CATALOG.keys())}",
        )

    interval = "annual" if payload.billing_interval.strip().lower() == "annual" else "monthly"

    ws = db.execute(
        text(
            """
            SELECT
                id, name,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                billing_cycle_end
            FROM workspaces
            WHERE id = CAST(:wid AS UUID)
            LIMIT 1
            """
        ),
        {"wid": workspace_id},
    ).fetchone()

    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    # Switching back to BYOK Free is always immediate per workspace
    if target_tier == "byok_free":
        updated = db.execute(
            text(
                """
                UPDATE workspaces
                SET plan_mode = 'byok',
                    plan_tier = 'byok_free',
                    requested_plan_tier = NULL,
                    billing_interval = :interval,
                    managed_request_status = 'none',
                    monthly_token_limit = 0
                WHERE id = CAST(:wid AS UUID)
                RETURNING
                    id, name, slug, is_active, plan_mode, plan_tier,
                    requested_plan_tier, billing_interval,
                    managed_approved, managed_request_status,
                    monthly_token_limit, tokens_used_this_month,
                    billing_cycle_end, industry, industry_config, created_at
                """
            ),
            {"wid": workspace_id, "interval": interval},
        ).fetchone()
        db.commit()
        return {
            "status": "activated",
            "message": "Workspace switched to BYOK Free ($0/mo). Configure your own keys in Settings -> Plan & AI Vault.",
            "workspace": _serialize_workspace(updated),
        }

    # Managed tier: activate immediately if workspace is already approved or requester is super admin
    can_activate_now = bool(ws.managed_approved) or _is_super_admin(payload.requester_email)
    new_limit = PLAN_CATALOG[target_tier]["monthly_token_limit"]
    next_cycle = ws.billing_cycle_end or (datetime.now(timezone.utc) + timedelta(days=30))

    if can_activate_now:
        updated = db.execute(
            text(
                """
                UPDATE workspaces
                SET plan_mode = 'managed',
                    plan_tier = :plan_tier,
                    requested_plan_tier = NULL,
                    billing_interval = :interval,
                    managed_approved = TRUE,
                    managed_request_status = 'approved',
                    monthly_token_limit = :token_limit,
                    billing_cycle_end = :cycle_end
                WHERE id = CAST(:wid AS UUID)
                RETURNING
                    id, name, slug, is_active, plan_mode, plan_tier,
                    requested_plan_tier, billing_interval,
                    managed_approved, managed_request_status,
                    monthly_token_limit, tokens_used_this_month,
                    billing_cycle_end, industry, industry_config, created_at
                """
            ),
            {
                "wid": workspace_id,
                "plan_tier": target_tier,
                "interval": interval,
                "token_limit": new_limit,
                "cycle_end": next_cycle,
            },
        ).fetchone()
        db.commit()
        return {
            "status": "activated",
            "message": f"{PLAN_CATALOG[target_tier]['label']} activated for {ws.name} ({new_limit:,} tokens/mo).",
            "workspace": _serialize_workspace(updated),
        }

    # Otherwise submit per-workspace Managed upgrade request for admin approval
    updated = db.execute(
        text(
            """
            UPDATE workspaces
            SET requested_plan_tier = :requested_tier,
                billing_interval = :interval,
                managed_request_status = 'pending'
            WHERE id = CAST(:wid AS UUID)
            RETURNING
                id, name, slug, is_active, plan_mode, plan_tier,
                requested_plan_tier, billing_interval,
                managed_approved, managed_request_status,
                monthly_token_limit, tokens_used_this_month,
                billing_cycle_end, industry, industry_config, created_at
            """
        ),
        {
            "wid": workspace_id,
            "requested_tier": target_tier,
            "interval": interval,
        },
    ).fetchone()
    db.commit()

    email_sent = _send_managed_upgrade_alert(
        workspace_id=workspace_id,
        workspace_name=ws.name,
        requester_email=payload.requester_email or "workspace-owner@stareleven.ai",
        requested_tier=target_tier,
        billing_interval=interval,
    )

    return {
        "status": "pending_approval",
        "email_alert_sent": email_sent,
        "message": (
            f"Upgrade request for {PLAN_CATALOG[target_tier]['label']} submitted for '{ws.name}'. "
            "Each Managed workspace is provisioned separately upon approval."
        ),
        "workspace": _serialize_workspace(updated),
    }


@router.post("/{workspace_id}/approve-managed")
async def approve_workspace_managed_plan(
    workspace_id: str,
    payload: ApproveManagedRequest,
    db: Session = Depends(get_db),
):
    if not _is_super_admin(payload.admin_email):
        raise HTTPException(
            status_code=403,
            detail="Only configured SUPER_ADMIN_EMAILS can approve Managed workspace plans.",
        )

    ws = db.execute(
        text(
            """
            SELECT id, name, requested_plan_tier, billing_interval
            FROM workspaces
            WHERE id = CAST(:wid AS UUID)
            LIMIT 1
            """
        ),
        {"wid": workspace_id},
    ).fetchone()

    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    final_tier = (
        (payload.plan_tier or ws.requested_plan_tier or "managed_starter")
        .strip()
        .lower()
    )
    if final_tier not in PLAN_CATALOG or final_tier == "byok_free":
        final_tier = "managed_starter"

    final_interval = (
        payload.billing_interval or ws.billing_interval or "monthly"
    ).strip().lower()
    token_limit = PLAN_CATALOG[final_tier]["monthly_token_limit"]
    cycle_end = datetime.now(timezone.utc) + timedelta(days=30)

    updated = db.execute(
        text(
            """
            UPDATE workspaces
            SET plan_mode = 'managed',
                plan_tier = :plan_tier,
                requested_plan_tier = NULL,
                billing_interval = :interval,
                managed_approved = TRUE,
                managed_request_status = 'approved',
                monthly_token_limit = :token_limit,
                tokens_used_this_month = 0,
                billing_cycle_end = :cycle_end
            WHERE id = CAST(:wid AS UUID)
            RETURNING
                id, name, slug, is_active, plan_mode, plan_tier,
                requested_plan_tier, billing_interval,
                managed_approved, managed_request_status,
                monthly_token_limit, tokens_used_this_month,
                billing_cycle_end, industry, industry_config, created_at
            """
        ),
        {
            "wid": workspace_id,
            "plan_tier": final_tier,
            "interval": final_interval,
            "token_limit": token_limit,
            "cycle_end": cycle_end,
        },
    ).fetchone()
    db.commit()

    return {
        "status": "approved",
        "message": f"Approved {PLAN_CATALOG[final_tier]['label']} for workspace '{ws.name}'.",
        "workspace": _serialize_workspace(updated),
    }


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdateRequest,
    db: Session = Depends(get_db),
):
    import json

    existing = db.execute(
        text(
            """
            SELECT
                id, name, slug,
                COALESCE(plan_mode, 'byok') AS plan_mode,
                COALESCE(plan_tier, 'byok_free') AS plan_tier,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                COALESCE(managed_request_status, 'none') AS managed_request_status,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                billing_cycle_end,
                COALESCE(industry, 'agency') AS industry
            FROM workspaces
            WHERE id = CAST(:wid AS UUID)
            LIMIT 1
            """
        ),
        {"wid": workspace_id},
    ).fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    updates = []
    params: Dict[str, Any] = {"wid": workspace_id}

    if payload.name is not None and payload.name.strip():
        updates.append("name = :name")
        params["name"] = payload.name.strip()

    if payload.slug is not None and payload.slug.strip():
        updates.append("slug = :slug")
        params["slug"] = _slugify(payload.slug)

    if payload.industry is not None:
        updates.append("industry = :industry")
        params["industry"] = _normalize_industry(payload.industry)

    if payload.industry_config is not None:
        updates.append("industry_config = CAST(:industry_config AS JSONB)")
        params["industry_config"] = json.dumps(payload.industry_config)

    if payload.billing_interval is not None:
        interval = "annual" if payload.billing_interval.lower() == "annual" else "monthly"
        updates.append("billing_interval = :billing_interval")
        params["billing_interval"] = interval

    # Handle plan_mode / plan_tier changes while enforcing per-workspace billing rules
    if payload.plan_tier is not None or payload.plan_mode is not None:
        requested_tier = (payload.plan_tier or "").strip().lower()
        requested_mode = (payload.plan_mode or "").strip().lower()

        if requested_tier == "byok_free" or (requested_mode == "byok" and not requested_tier):
            updates.extend(
                [
                    "plan_mode = 'byok'",
                    "plan_tier = 'byok_free'",
                    "requested_plan_tier = NULL",
                    "managed_request_status = 'none'",
                    "monthly_token_limit = 0",
                ]
            )
        else:
            target_tier = (
                requested_tier
                if requested_tier in PLAN_CATALOG and requested_tier != "byok_free"
                else (
                    existing.plan_tier
                    if existing.plan_tier in PLAN_CATALOG and existing.plan_tier != "byok_free"
                    else "managed_starter"
                )
            )
            if bool(existing.managed_approved) or _is_super_admin(payload.requester_email):
                limit = PLAN_CATALOG[target_tier]["monthly_token_limit"]
                cycle_end = existing.billing_cycle_end or (
                    datetime.now(timezone.utc) + timedelta(days=30)
                )
                updates.extend(
                    [
                        "plan_mode = 'managed'",
                        "plan_tier = :plan_tier",
                        "requested_plan_tier = NULL",
                        "managed_approved = TRUE",
                        "managed_request_status = 'approved'",
                        "monthly_token_limit = :token_limit",
                        "billing_cycle_end = :cycle_end",
                    ]
                )
                params["plan_tier"] = target_tier
                params["token_limit"] = limit
                params["cycle_end"] = cycle_end
            else:
                updates.extend(
                    [
                        "requested_plan_tier = :requested_tier",
                        "managed_request_status = 'pending'",
                    ]
                )
                params["requested_tier"] = target_tier

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided to update.")

    query = f"""
        UPDATE workspaces
        SET {', '.join(updates)}
        WHERE id = CAST(:wid AS UUID)
        RETURNING
            id, name, slug, is_active, plan_mode, plan_tier,
            requested_plan_tier, billing_interval,
            managed_approved, managed_request_status,
            monthly_token_limit, tokens_used_this_month,
            billing_cycle_end, industry, industry_config, created_at
    """
    updated_row = db.execute(text(query), params).fetchone()
    db.commit()

    return _serialize_workspace(updated_row)