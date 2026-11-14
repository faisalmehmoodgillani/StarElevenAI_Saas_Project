import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/workspaces", tags=["Workspace Team"])


class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: str = "operator"
    invited_by: Optional[str] = None


def _ensure_workspace_members_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS workspace_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                user_email VARCHAR(255) NOT NULL,
                user_id UUID NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'operator',
                status VARCHAR(50) NOT NULL DEFAULT 'invited',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (workspace_id, user_email)
            );
            """
        )
    )
    db.execute(
        text(
            """
            ALTER TABLE workspace_members
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';
            """
        )
    )


def _send_invite_email(
    recipient_email: str,
    workspace_name: str,
    role: str,
    invited_by: Optional[str],
) -> tuple[bool, str]:
    smtp_host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    smtp_port = int((os.getenv("SMTP_PORT") or "465").strip())
    smtp_user = (os.getenv("SMTP_USER") or "").strip()
    smtp_password = (os.getenv("SMTP_PASSWORD") or "").strip().replace(" ", "")
    app_url = (os.getenv("FRONTEND_APP_URL") or "http://localhost:3000").rstrip("/")

    if not smtp_user or not smtp_password:
        return (
            False,
            "Member saved in Supabase, but SMTP_USER or SMTP_PASSWORD is empty in .env.",
        )

    inviter_label = invited_by or "Workspace Admin"
    login_link = f"{app_url}/login"

    html_body = f"""
    <div style="background-color:#09090B;padding:32px;font-family:Arial,sans-serif;color:#F4F4F5;">
      <div style="max-width:520px;margin:0 auto;background:#121215;border:1px solid #27272A;border-radius:16px;padding:28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#84CC16;text-transform:uppercase;">
          StarEleven AI SaaS OS
        </div>
        <h2 style="margin:12px 0 8px;color:#FFFFFF;font-size:20px;">
          You're Invited to {workspace_name}
        </h2>
        <p style="color:#A1A1AA;font-size:13px;line-height:1.6;">
          <strong style="color:#E4E4E7;">{inviter_label}</strong> has invited you to join
          <strong style="color:#A3E635;">{workspace_name}</strong> as an
          <strong style="color:#FFFFFF;">{role.upper()}</strong>.
        </p>
        <div style="margin:24px 0;">
          <a href="{login_link}"
             style="display:inline-block;background:#84CC16;color:#09090B;font-weight:700;font-size:13px;padding:12px 22px;border-radius:10px;text-decoration:none;">
            Accept Invite &amp; Open Workspace
          </a>
        </div>
        <p style="color:#71717A;font-size:11px;margin-top:20px;">
          Sign in with <strong>{recipient_email}</strong> (via Google or Email) to access this workspace automatically.
        </p>
      </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Invitation: Join {workspace_name} on StarEleven AI"
    msg["From"] = f"StarEleven AI <{smtp_user}>"
    msg["To"] = recipient_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [recipient_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_user, [recipient_email], msg.as_string())
        return True, f"Invitation email sent to {recipient_email}!"
    except Exception as exc:
        logger.exception("Failed to send workspace invite email")
        return False, f"Member saved in database, but SMTP error occurred: {exc}"

@router.get("/{workspace_id}/members")
def list_workspace_members(workspace_id: str, db: Session = Depends(get_db)):
    _ensure_workspace_members_table(db)
    db.commit()

    rows = db.execute(
        text(
            """
            SELECT user_email, role, COALESCE(status, 'active') AS status, created_at
            FROM workspace_members
            WHERE workspace_id = CAST(:wid AS UUID)
            ORDER BY created_at ASC
            """
        ),
        {"wid": workspace_id},
    ).fetchall()

    return {
        "members": [
            {
                "email": r.user_email,
                "role": r.role,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/{workspace_id}/invite")
def invite_workspace_member(
    workspace_id: str,
    payload: TeamInviteRequest,
    db: Session = Depends(get_db),
):
    ws = db.execute(
        text("SELECT name FROM workspaces WHERE id = CAST(:wid AS UUID) LIMIT 1"),
        {"wid": workspace_id},
    ).fetchone()

    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    clean_email = payload.email.strip().lower()
    clean_role = payload.role.strip().lower() or "operator"

    _ensure_workspace_members_table(db)

    db.execute(
        text(
            """
            INSERT INTO workspace_members (workspace_id, user_email, role, status)
            VALUES (CAST(:wid AS UUID), CAST(:email AS VARCHAR), CAST(:role AS VARCHAR), 'invited')
            ON CONFLICT (workspace_id, user_email)
            DO UPDATE SET role = EXCLUDED.role, status = 'invited'
            """
        ),
        {"wid": workspace_id, "email": clean_email, "role": clean_role},
    )
    db.commit()

    email_sent, info_message = _send_invite_email(
        recipient_email=clean_email,
        workspace_name=ws.name,
        role=clean_role,
        invited_by=payload.invited_by,
    )

    return {
        "ok": True,
        "email_sent": email_sent,
        "message": info_message,
        "member": {
            "email": clean_email,
            "role": clean_role,
            "status": "invited",
        },
    }


@router.delete("/{workspace_id}/members/{member_email}")
def remove_workspace_member(
    workspace_id: str,
    member_email: str,
    db: Session = Depends(get_db),
):
    _ensure_workspace_members_table(db)
    db.execute(
        text(
            """
            DELETE FROM workspace_members
            WHERE workspace_id = CAST(:wid AS UUID)
              AND LOWER(user_email) = LOWER(CAST(:email AS VARCHAR))
            """
        ),
        {"wid": workspace_id, "email": member_email.strip()},
    )
    db.commit()
    return {"ok": True}