import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.session import get_db

load_dotenv()

router = APIRouter(prefix="/admin", tags=["Super Admin Command Center"])

PLAN_DEFAULT_QUOTAS: dict[str, int] = {
    "byok_free": 0,
    "managed_starter": 2_000_000,
    "managed_growth": 10_000_000,
    "managed_enterprise": 35_000_000,
}

INDUSTRY_LABELS: dict[str, str] = {
    "agency": "Agency",
    "real_estate": "Real Estate",
    "ecommerce": "E-Commerce",
    "healthcare": "Healthcare",
    "education": "Education",
    "saas": "SaaS",
    "other": "Other",
}


def _get_super_admin_emails() -> set[str]:
    raw = os.getenv("SUPER_ADMIN_EMAILS") or os.getenv("SUPER_ADMIN_EMAIL") or ""
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def verify_super_admin(
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
    admin_email: Optional[str] = Query(default=None),
) -> str:
    allowed_admins = _get_super_admin_emails()
    if not allowed_admins:
        raise HTTPException(
            status_code=403,
            detail="Super Admin access is not configured on the server.",
        )

    caller = (x_user_email or admin_email or "").strip().lower()
    if not caller or caller not in allowed_admins:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Super Admin privileges are required.",
        )
    return caller


class AdminWorkspaceDecisionRequest(BaseModel):
    action: str = Field(
        ...,
        description=(
            "One of: approve_managed, reject_managed, assign_plan, "
            "add_bonus_tokens, reset_monthly_usage, extend_cycle, "
            "set_discount, update_quota, suspend, reactivate"
        ),
    )
    plan_tier: Optional[str] = Field(default=None)
    monthly_token_limit: Optional[int] = Field(default=None, ge=0)
    bonus_tokens: Optional[int] = Field(default=None, ge=1)
    extra_days: Optional[int] = Field(default=None, ge=1, le=365)
    discount_percent: Optional[int] = Field(default=None, ge=0, le=100)
    custom_monthly_price: Optional[float] = Field(default=None, ge=0)
    discount_note: Optional[str] = Field(default=None)


class UserWorkspaceAllowanceRequest(BaseModel):
    max_workspaces_allowed: int = Field(..., ge=1, le=500)


class PromoCodeCreateRequest(BaseModel):
    code: str = Field(..., min_length=3, max_length=40)
    discount_percent: int = Field(default=20, ge=0, le=100)
    bonus_tokens: int = Field(default=0, ge=0)
    extra_workspaces: int = Field(default=0, ge=0, le=100)
    max_uses: int = Field(default=50, ge=1, le=100000)
    valid_days: Optional[int] = Field(default=30, ge=1, le=3650)


@router.get("/overview")
def get_admin_platform_overview(
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    users_rows = db.execute(
        text(
            """
            SELECT LOWER(email) AS email, LOWER(COALESCE(role, 'owner')) AS role
            FROM users
            WHERE email IS NOT NULL AND TRIM(email) <> ''
            """
        )
    ).fetchall()

    member_rows = db.execute(
        text(
            """
            SELECT LOWER(user_email) AS email, LOWER(COALESCE(role, 'operator')) AS role
            FROM workspace_members
            WHERE user_email IS NOT NULL AND TRIM(user_email) <> ''
            """
        )
    ).fetchall()

    user_roles: dict[str, str] = {}
    for row in users_rows:
        email = (row.email or "").strip().lower()
        if email:
            user_roles[email] = "owner" if row.role in ("owner", "admin") else row.role

    for row in member_rows:
        email = (row.email or "").strip().lower()
        if not email:
            continue
        if email not in user_roles:
            user_roles[email] = "owner" if row.role == "owner" else "operator"
        elif row.role == "owner":
            user_roles[email] = "owner"

    total_users = len(user_roles)
    owners_count = sum(1 for r in user_roles.values() if r == "owner")
    operators_count = max(0, total_users - owners_count)

    ws_rows = db.execute(
        text(
            """
            SELECT
                id,
                COALESCE(is_active, TRUE) AS is_active,
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                LOWER(COALESCE(plan_tier, 'byok_free')) AS plan_tier,
                LOWER(COALESCE(managed_request_status, 'none')) AS managed_request_status,
                LOWER(COALESCE(industry, 'agency')) AS industry,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit
            FROM workspaces
            """
        )
    ).fetchall()

    total_workspaces = len(ws_rows)
    active_workspaces = sum(1 for w in ws_rows if bool(w.is_active))
    suspended_workspaces = total_workspaces - active_workspaces

    plan_mode_counts = {"byok": 0, "managed": 0}
    plan_tier_counts = {
        "byok_free": 0,
        "managed_starter": 0,
        "managed_growth": 0,
        "managed_enterprise": 0,
    }
    request_status_counts = {"none": 0, "pending": 0, "approved": 0, "rejected": 0}
    industry_counts: dict[str, int] = {}

    total_tokens_consumed = 0
    total_monthly_token_quota = 0

    for w in ws_rows:
        mode = w.plan_mode if w.plan_mode in plan_mode_counts else "byok"
        plan_mode_counts[mode] += 1

        tier = w.plan_tier or "byok_free"
        plan_tier_counts[tier] = plan_tier_counts.get(tier, 0) + 1

        req_status = w.managed_request_status or "none"
        request_status_counts[req_status] = request_status_counts.get(req_status, 0) + 1

        ind = (w.industry or "agency").strip().lower()
        industry_counts[ind] = industry_counts.get(ind, 0) + 1

        total_tokens_consumed += int(w.tokens_used_this_month or 0)
        total_monthly_token_quota += int(w.monthly_token_limit or 0)

    agent_count_row = db.execute(
        text("SELECT COUNT(*) AS cnt FROM agent_configs")
    ).fetchone()
    total_configured_agents = int(agent_count_row.cnt or 0) if agent_count_row else 0

    total_conversations = 0
    try:
        conv_row = db.execute(
            text("SELECT COUNT(DISTINCT thread_id) AS cnt FROM checkpoints")
        ).fetchone()
        total_conversations = int(conv_row.cnt or 0) if conv_row else 0
    except Exception:
        total_conversations = 0

    industry_distribution = [
        {
            "industry": ind,
            "label": INDUSTRY_LABELS.get(ind, ind.replace("_", " ").title()),
            "count": count,
            "percentage": round((count / total_workspaces) * 100, 1)
            if total_workspaces > 0
            else 0.0,
        }
        for ind, count in sorted(
            industry_counts.items(), key=lambda item: item[1], reverse=True
        )
    ]

    return {
        "total_users": total_users,
        "owners_count": owners_count,
        "operators_count": operators_count,
        "total_workspaces": total_workspaces,
        "active_workspaces": active_workspaces,
        "suspended_workspaces": suspended_workspaces,
        "workspaces_by_plan_mode": plan_mode_counts,
        "workspaces_by_plan_tier": plan_tier_counts,
        "workspaces_by_request_status": request_status_counts,
        "total_configured_agents": total_configured_agents,
        "total_conversations": total_conversations,
        "total_tokens_consumed": total_tokens_consumed,
        "total_monthly_token_quota": total_monthly_token_quota,
        "industry_distribution": industry_distribution,
    }


@router.get("/users")
def get_admin_users_directory(
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    workspaces_rows = db.execute(
        text(
            """
            SELECT
                id,
                name,
                slug,
                COALESCE(is_active, TRUE) AS is_active,
                LOWER(COALESCE(plan_mode, 'byok')) AS plan_mode,
                LOWER(COALESCE(plan_tier, 'byok_free')) AS plan_tier,
                requested_plan_tier,
                COALESCE(billing_interval, 'monthly') AS billing_interval,
                COALESCE(managed_approved, FALSE) AS managed_approved,
                LOWER(COALESCE(managed_request_status, 'none')) AS managed_request_status,
                LOWER(COALESCE(industry, 'agency')) AS industry,
                COALESCE(tokens_used_this_month, 0) AS tokens_used_this_month,
                COALESCE(monthly_token_limit, 0) AS monthly_token_limit,
                COALESCE(discount_percent, 0) AS discount_percent,
                custom_monthly_price,
                discount_note,
                applied_promo_code,
                billing_cycle_end,
                created_at
            FROM workspaces
            ORDER BY created_at DESC
            """
        )
    ).fetchall()

    agent_rows = db.execute(
        text(
            """
            SELECT
                id,
                workspace_id,
                agent_type,
                provider,
                model_name,
                (encrypted_api_key IS NOT NULL AND TRIM(encrypted_api_key) <> '') AS has_custom_key,
                TRUE AS is_active
            FROM agent_configs
            ORDER BY id DESC
            """
        )
    ).fetchall()

    agents_by_workspace: dict[str, list[dict[str, Any]]] = {}
    for ag in agent_rows:
        wid = str(ag.workspace_id)
        agents_by_workspace.setdefault(wid, []).append(
            {
                "id": str(ag.id),
                "agent_type": ag.agent_type,
                "provider": ag.provider,
                "model_name": ag.model_name,
                "has_custom_key": bool(ag.has_custom_key),
                "is_active": bool(ag.is_active),
            }
        )

    workspaces_map: dict[str, dict[str, Any]] = {}
    for w in workspaces_rows:
        wid = str(w.id)
        used = int(w.tokens_used_this_month or 0)
        limit = int(w.monthly_token_limit or 0)
        usage_pct = round((used / limit) * 100, 1) if limit > 0 else 0.0

        workspaces_map[wid] = {
            "id": wid,
            "workspace_id": wid,
            "name": w.name,
            "slug": w.slug,
            "industry": w.industry or "agency",
            "plan_tier": w.plan_tier or "byok_free",
            "plan_mode": w.plan_mode or "byok",
            "requested_plan_tier": w.requested_plan_tier,
            "billing_interval": w.billing_interval or "monthly",
            "managed_approved": bool(w.managed_approved),
            "managed_request_status": w.managed_request_status or "none",
            "tokens_used_this_month": used,
            "monthly_token_limit": limit,
            "usage_percent": usage_pct,
            "discount_percent": int(w.discount_percent or 0),
            "custom_monthly_price": float(w.custom_monthly_price)
            if w.custom_monthly_price is not None
            else None,
            "discount_note": w.discount_note,
            "applied_promo_code": w.applied_promo_code,
            "billing_cycle_end": w.billing_cycle_end.isoformat()
            if w.billing_cycle_end
            else None,
            "is_active": bool(w.is_active),
            "configured_agents": agents_by_workspace.get(wid, []),
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }

    users_table_rows = db.execute(
        text(
            """
            SELECT
                id,
                workspace_id,
                email,
                full_name,
                hashed_password,
                LOWER(COALESCE(role, 'owner')) AS role,
                COALESCE(max_workspaces_allowed, 1) AS max_workspaces_allowed,
                created_at
            FROM users
            WHERE email IS NOT NULL AND TRIM(email) <> ''
            ORDER BY created_at DESC
            """
        )
    ).fetchall()

    members_table_rows = db.execute(
        text(
            """
            SELECT
                workspace_id,
                user_email,
                LOWER(COALESCE(role, 'operator')) AS role,
                LOWER(COALESCE(status, 'active')) AS status,
                created_at
            FROM workspace_members
            WHERE user_email IS NOT NULL AND TRIM(user_email) <> ''
            """
        )
    ).fetchall()

    users_directory: dict[str, dict[str, Any]] = {}

    for u in users_table_rows:
        email = (u.email or "").strip().lower()
        if not email:
            continue

        hp = u.hashed_password or ""
        if hp.startswith("oauth:"):
            signup_method = "Google OAuth"
        elif hp.startswith("supabase:"):
            signup_method = "Email & OTP"
        else:
            signup_method = "Direct / Password"

        normalized_role = "owner" if u.role in ("owner", "admin") else u.role
        allowance = int(u.max_workspaces_allowed or 1)

        if email not in users_directory:
            users_directory[email] = {
                "user_id": str(u.id),
                "email": email,
                "full_name": u.full_name or email.split("@")[0],
                "primary_role": normalized_role,
                "signup_method": signup_method,
                "max_workspaces_allowed": allowance,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "_workspace_roles": {},
            }
        else:
            users_directory[email]["max_workspaces_allowed"] = max(
                users_directory[email]["max_workspaces_allowed"], allowance
            )

        if u.workspace_id:
            wid = str(u.workspace_id)
            if wid in workspaces_map:
                users_directory[email]["_workspace_roles"][wid] = normalized_role

    for m in members_table_rows:
        email = (m.user_email or "").strip().lower()
        wid = str(m.workspace_id) if m.workspace_id else ""
        if not email or wid not in workspaces_map:
            continue

        member_role = m.role or "operator"
        if email not in users_directory:
            users_directory[email] = {
                "user_id": f"invited:{email}",
                "email": email,
                "full_name": email.split("@")[0],
                "primary_role": member_role,
                "signup_method": "Team Invite",
                "max_workspaces_allowed": 1,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "_workspace_roles": {wid: member_role},
            }
        else:
            existing_role = users_directory[email]["_workspace_roles"].get(wid)
            if existing_role != "owner":
                users_directory[email]["_workspace_roles"][wid] = member_role
            if member_role == "owner":
                users_directory[email]["primary_role"] = "owner"

    formatted_users: list[dict[str, Any]] = []
    workspace_owners: dict[str, dict[str, str]] = {}

    for email, record in users_directory.items():
        ws_roles: dict[str, str] = record.pop("_workspace_roles")
        nested_workspaces: list[dict[str, Any]] = []
        owned_count = 0
        joined_count = 0

        for wid, role in ws_roles.items():
            ws_copy = dict(workspaces_map[wid])
            ws_copy["member_role"] = role
            nested_workspaces.append(ws_copy)

            if role == "owner":
                owned_count += 1
                workspace_owners[wid] = {
                    "owner_email": email,
                    "owner_name": record["full_name"],
                }
            else:
                joined_count += 1
                if wid not in workspace_owners:
                    workspace_owners[wid] = {
                        "owner_email": email,
                        "owner_name": record["full_name"],
                    }

        nested_workspaces.sort(
            key=lambda item: (0 if item["member_role"] == "owner" else 1, item["name"])
        )

        record["total_workspaces"] = len(nested_workspaces)
        record["owned_workspaces_count"] = owned_count
        record["joined_workspaces_count"] = joined_count
        record["workspaces"] = nested_workspaces
        formatted_users.append(record)

    formatted_users.sort(
        key=lambda item: (
            0 if item["primary_role"] == "owner" else 1,
            -item["total_workspaces"],
            item["email"],
        )
    )

    pending_requests: list[dict[str, Any]] = []
    for wid, ws in workspaces_map.items():
        if ws["managed_request_status"] == "pending":
            req_tier = (ws.get("requested_plan_tier") or "managed_starter").lower()
            default_quota = PLAN_DEFAULT_QUOTAS.get(req_tier, 2_000_000)
            owner_meta = workspace_owners.get(
                wid, {"owner_email": "unknown@client.com", "owner_name": "Workspace Owner"}
            )
            pending_requests.append(
                {
                    "workspace_id": wid,
                    "workspace_name": ws["name"],
                    "slug": ws["slug"],
                    "industry": ws["industry"],
                    "owner_email": owner_meta["owner_email"],
                    "owner_name": owner_meta["owner_name"],
                    "requested_plan_tier": req_tier,
                    "billing_interval": ws["billing_interval"],
                    "current_monthly_token_limit": ws["monthly_token_limit"],
                    "default_monthly_token_limit": default_quota,
                    "discount_percent": ws["discount_percent"],
                    "custom_monthly_price": ws["custom_monthly_price"],
                    "applied_promo_code": ws["applied_promo_code"],
                    "created_at": ws["created_at"],
                }
            )

    return {
        "total_users": len(formatted_users),
        "pending_managed_requests": pending_requests,
        "users": formatted_users,
    }


@router.patch("/users/{user_email}/allowance")
def update_user_workspace_allowance(
    user_email: str,
    payload: UserWorkspaceAllowanceRequest,
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    clean_email = user_email.strip().lower()
    if not clean_email:
        raise HTTPException(status_code=400, detail="Valid user email is required.")

    result = db.execute(
        text(
            """
            UPDATE users
            SET max_workspaces_allowed = :allowance
            WHERE LOWER(email) = :email
            """
        ),
        {"allowance": payload.max_workspaces_allowed, "email": clean_email},
    )
    db.commit()

    return {
        "status": "updated",
        "email": clean_email,
        "max_workspaces_allowed": payload.max_workspaces_allowed,
        "rows_updated": result.rowcount or 0,
    }


@router.patch("/workspaces/{workspace_id}/decision")
def decide_workspace_admin_action(
    workspace_id: str,
    payload: AdminWorkspaceDecisionRequest,
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    try:
        wid = uuid.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace_id UUID.")

    row = db.execute(
        text(
            """
            SELECT
                id,
                name,
                slug,
                plan_mode,
                plan_tier,
                requested_plan_tier,
                monthly_token_limit,
                tokens_used_this_month,
                billing_cycle_end,
                is_active
            FROM workspaces
            WHERE id = :wid
            """
        ),
        {"wid": wid},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    action = payload.action.strip().lower()
    now_utc = datetime.now(timezone.utc)

    if action in ("approve_managed", "assign_plan"):
        target_tier = (
            payload.plan_tier
            or row.requested_plan_tier
            or (row.plan_tier if row.plan_tier != "byok_free" else "managed_starter")
        ).strip().lower()

        if target_tier == "byok_free":
            db.execute(
                text(
                    """
                    UPDATE workspaces
                    SET plan_mode = 'byok',
                        plan_tier = 'byok_free',
                        managed_approved = FALSE,
                        managed_request_status = 'none',
                        requested_plan_tier = NULL,
                        monthly_token_limit = 0
                    WHERE id = :wid
                    """
                ),
                {"wid": wid},
            )
        else:
            default_quota = PLAN_DEFAULT_QUOTAS.get(target_tier, 2_000_000)
            final_quota = (
                payload.monthly_token_limit
                if payload.monthly_token_limit is not None
                and payload.monthly_token_limit > 0
                else (
                    int(row.monthly_token_limit or 0)
                    if int(row.monthly_token_limit or 0) > 0
                    else default_quota
                )
            )
            cycle_days = payload.extra_days if payload.extra_days else 30
            cycle_end = now_utc + timedelta(days=cycle_days)

            db.execute(
                text(
                    """
                    UPDATE workspaces
                    SET plan_mode = 'managed',
                        plan_tier = :plan_tier,
                        managed_approved = TRUE,
                        managed_request_status = 'approved',
                        requested_plan_tier = NULL,
                        monthly_token_limit = :monthly_token_limit,
                        billing_cycle_end = :billing_cycle_end,
                        discount_percent = COALESCE(:discount_percent, discount_percent),
                        custom_monthly_price = COALESCE(:custom_monthly_price, custom_monthly_price),
                        discount_note = COALESCE(:discount_note, discount_note),
                        is_active = TRUE
                    WHERE id = :wid
                    """
                ),
                {
                    "wid": wid,
                    "plan_tier": target_tier,
                    "monthly_token_limit": final_quota,
                    "billing_cycle_end": cycle_end,
                    "discount_percent": payload.discount_percent,
                    "custom_monthly_price": payload.custom_monthly_price,
                    "discount_note": payload.discount_note,
                },
            )

    elif action == "reject_managed":
        db.execute(
            text(
                """
                UPDATE workspaces
                SET plan_mode = 'byok',
                    plan_tier = 'byok_free',
                    managed_approved = FALSE,
                    managed_request_status = 'rejected',
                    requested_plan_tier = NULL,
                    monthly_token_limit = 0
                WHERE id = :wid
                """
            ),
            {"wid": wid},
        )

    elif action == "add_bonus_tokens":
        if not payload.bonus_tokens or payload.bonus_tokens <= 0:
            raise HTTPException(
                status_code=400, detail="bonus_tokens must be greater than 0."
            )
        db.execute(
            text(
                """
                UPDATE workspaces
                SET monthly_token_limit = COALESCE(monthly_token_limit, 0) + :bonus
                WHERE id = :wid
                """
            ),
            {"wid": wid, "bonus": payload.bonus_tokens},
        )

    elif action == "reset_monthly_usage":
        db.execute(
            text(
                """
                UPDATE workspaces
                SET tokens_used_this_month = 0
                WHERE id = :wid
                """
            ),
            {"wid": wid},
        )

    elif action == "extend_cycle":
        days = payload.extra_days or 30
        base_dt = (
            row.billing_cycle_end
            if row.billing_cycle_end and row.billing_cycle_end > now_utc
            else now_utc
        )
        new_cycle_end = base_dt + timedelta(days=days)
        db.execute(
            text(
                """
                UPDATE workspaces
                SET billing_cycle_end = :new_end
                WHERE id = :wid
                """
            ),
            {"wid": wid, "new_end": new_cycle_end},
        )

    elif action == "set_discount":
        db.execute(
            text(
                """
                UPDATE workspaces
                SET discount_percent = COALESCE(:discount_percent, 0),
                    custom_monthly_price = :custom_monthly_price,
                    discount_note = :discount_note
                WHERE id = :wid
                """
            ),
            {
                "wid": wid,
                "discount_percent": payload.discount_percent or 0,
                "custom_monthly_price": payload.custom_monthly_price,
                "discount_note": payload.discount_note,
            },
        )

    elif action == "update_quota":
        if payload.monthly_token_limit is None:
            raise HTTPException(
                status_code=400,
                detail="monthly_token_limit is required for update_quota.",
            )
        db.execute(
            text(
                """
                UPDATE workspaces
                SET monthly_token_limit = :monthly_token_limit
                WHERE id = :wid
                """
            ),
            {"wid": wid, "monthly_token_limit": payload.monthly_token_limit},
        )

    elif action == "suspend":
        db.execute(
            text("UPDATE workspaces SET is_active = FALSE WHERE id = :wid"),
            {"wid": wid},
        )

    elif action == "reactivate":
        db.execute(
            text("UPDATE workspaces SET is_active = TRUE WHERE id = :wid"),
            {"wid": wid},
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported administrative action '{payload.action}'.",
        )

    db.commit()

    updated = db.execute(
        text(
            """
            SELECT
                id,
                name,
                slug,
                is_active,
                plan_mode,
                plan_tier,
                managed_approved,
                managed_request_status,
                monthly_token_limit,
                tokens_used_this_month,
                discount_percent,
                custom_monthly_price,
                discount_note,
                billing_cycle_end
            FROM workspaces
            WHERE id = :wid
            """
        ),
        {"wid": wid},
    ).fetchone()

    return {
        "status": "updated",
        "action": action,
        "workspace": {
            "id": str(updated.id),
            "name": updated.name,
            "slug": updated.slug,
            "is_active": bool(updated.is_active),
            "plan_mode": updated.plan_mode,
            "plan_tier": updated.plan_tier,
            "managed_approved": bool(updated.managed_approved),
            "managed_request_status": updated.managed_request_status,
            "monthly_token_limit": int(updated.monthly_token_limit or 0),
            "tokens_used_this_month": int(updated.tokens_used_this_month or 0),
            "discount_percent": int(updated.discount_percent or 0),
            "custom_monthly_price": float(updated.custom_monthly_price)
            if updated.custom_monthly_price is not None
            else None,
            "discount_note": updated.discount_note,
            "billing_cycle_end": updated.billing_cycle_end.isoformat()
            if updated.billing_cycle_end
            else None,
        },
    }


# ==============================================================================
# PROMO CODES & SPECIAL OFFERS MANAGEMENT
# ==============================================================================


@router.get("/promo-codes")
def list_promo_codes(
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rows = db.execute(
        text(
            """
            SELECT
                id,
                code,
                discount_percent,
                bonus_tokens,
                extra_workspaces,
                max_uses,
                times_used,
                expires_at,
                is_active,
                created_at
            FROM promo_codes
            ORDER BY created_at DESC
            """
        )
    ).fetchall()

    return {
        "promo_codes": [
            {
                "id": str(r.id),
                "code": r.code,
                "discount_percent": int(r.discount_percent or 0),
                "bonus_tokens": int(r.bonus_tokens or 0),
                "extra_workspaces": int(r.extra_workspaces or 0),
                "max_uses": int(r.max_uses or 0),
                "times_used": int(r.times_used or 0),
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "is_active": bool(r.is_active),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/promo-codes")
def create_promo_code(
    payload: PromoCodeCreateRequest,
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    clean_code = payload.code.strip().upper().replace(" ", "")
    existing = db.execute(
        text("SELECT id FROM promo_codes WHERE UPPER(code) = :code"),
        {"code": clean_code},
    ).fetchone()
    if existing:
        raise HTTPException(
            status_code=409, detail=f"Promo code '{clean_code}' already exists."
        )

    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=payload.valid_days)
        if payload.valid_days
        else None
    )

    inserted = db.execute(
        text(
            """
            INSERT INTO promo_codes (
                code,
                discount_percent,
                bonus_tokens,
                extra_workspaces,
                max_uses,
                expires_at,
                is_active
            )
            VALUES (
                :code,
                :discount_percent,
                :bonus_tokens,
                :extra_workspaces,
                :max_uses,
                :expires_at,
                TRUE
            )
            RETURNING id, code
            """
        ),
        {
            "code": clean_code,
            "discount_percent": payload.discount_percent,
            "bonus_tokens": payload.bonus_tokens,
            "extra_workspaces": payload.extra_workspaces,
            "max_uses": payload.max_uses,
            "expires_at": expires_at,
        },
    ).fetchone()
    db.commit()

    return {"status": "created", "id": str(inserted.id), "code": inserted.code}


@router.patch("/promo-codes/{promo_id}/toggle")
def toggle_promo_code(
    promo_id: str,
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    try:
        pid = uuid.UUID(promo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid promo_id UUID.")

    db.execute(
        text(
            """
            UPDATE promo_codes
            SET is_active = NOT COALESCE(is_active, TRUE)
            WHERE id = :pid
            """
        ),
        {"pid": pid},
    )
    db.commit()
    return {"status": "toggled", "id": promo_id}


@router.delete("/promo-codes/{promo_id}")
def delete_promo_code(
    promo_id: str,
    _admin: str = Depends(verify_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    try:
        pid = uuid.UUID(promo_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid promo_id UUID.")

    db.execute(text("DELETE FROM promo_codes WHERE id = :pid"), {"pid": pid})
    db.commit()
    return {"status": "deleted", "id": promo_id}