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


def _get_workspace_owner_email(db: Session, workspace_id: str) -> tuple[Optional[str], Optional[str]]:
    owner_row = db.execute(
        text(
            """
            SELECT email, full_name
            FROM users
            WHERE workspace_id = CAST(:wid AS UUID)
            ORDER BY created_at ASC
            LIMIT 1
            """
        ),
        {"wid": workspace_id},
    ).fetchone()
    if owner_row:
        return (owner_row.email or "").strip().lower(), owner_row.full_name
    return None, None


def _role_summary_text(role: str) -> str:
    r = role.lower()
    if r == "admin":
        return "Full operational & administrative access across AI Agents, Knowledge Base, CRM Leads, and Team workflows."
    if r == "viewer":
        return "Read-only executive visibility into AI conversations, workspace reports, and analytics."
    return "Operational access to AI Command Center, CRM & Lead pipelines, and workspace Knowledge Base using the company's pre-configured AI engine."


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
            "Member saved in database, but SMTP_USER or SMTP_PASSWORD is missing in .env.",
        )

    inviter_label = invited_by or "Workspace Administrator"
    login_link = f"{app_url}/login"
    role_upper = role.upper()
    role_desc = _role_summary_text(role)

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#09090B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F4F4F5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090B;padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#111114;border:1px solid #27272A;border-radius:18px;overflow:hidden;">
              
              <!-- Top Electric Lime Accent Bar -->
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#84CC16 0%,#A3E635 50%,#4D7C0F 100%);"></td>
              </tr>

              <!-- Brand Header -->
              <tr>
                <td style="padding:28px 32px 20px;border-bottom:1px solid #1F1F23;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <span style="display:inline-block;background-color:rgba(132,204,22,0.12);border:1px solid rgba(132,204,22,0.35);color:#A3E635;font-size:11px;font-weight:700;letter-spacing:1.6px;padding:5px 10px;border-radius:6px;text-transform:uppercase;">
                          StarEleven AI &bull; Enterprise OS
                        </span>
                      </td>
                      <td align="right" style="font-size:11px;color:#71717A;font-family:monospace;">
                        WORKSPACE INVITATION
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding:32px;">
                  <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                    Collaborate inside <span style="color:#A3E635;">{workspace_name}</span>
                  </h1>
                  <p style="margin:0 0 24px;font-size:14px;color:#A1A1AA;line-height:1.65;">
                    <strong style="color:#F4F4F5;">{inviter_label}</strong> has provisioned team access for you in the <strong style="color:#F4F4F5;">{workspace_name}</strong> AI workspace on StarEleven AI.
                  </p>

                  <!-- Structured Assignment Card -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090B;border:1px solid #27272A;border-radius:12px;margin-bottom:26px;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#71717A;padding-bottom:6px;">
                              Organization Workspace
                            </td>
                            <td align="right" style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#71717A;padding-bottom:6px;">
                              Assigned Role
                            </td>
                          </tr>
                          <tr>
                            <td style="font-size:15px;font-weight:700;color:#FFFFFF;">
                              {workspace_name}
                            </td>
                            <td align="right">
                              <span style="display:inline-block;background-color:rgba(132,204,22,0.16);border:1px solid rgba(132,204,22,0.45);color:#A3E635;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;letter-spacing:0.8px;">
                                {role_upper}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="padding-top:14px;border-top:1px solid #18181B;margin-top:14px;font-size:12px;color:#A1A1AA;line-height:1.55;">
                              <strong style="color:#E4E4E7;">Permissions Scope:</strong> {role_desc}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Primary CTA Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <a href="{login_link}"
                           style="display:inline-block;background-color:#84CC16;color:#09090B;font-size:14px;font-weight:700;padding:14px 30px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
                          Accept Invitation &amp; Launch Workspace &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Sign-In Instructions -->
                  <div style="margin-top:26px;padding:14px 16px;background-color:#16161A;border-left:3px solid #84CC16;border-radius:6px;">
                    <p style="margin:0;font-size:12px;color:#D4D4D8;line-height:1.55;">
                      <strong>How to access:</strong> Sign in using <strong style="color:#A3E635;">{recipient_email}</strong> via Google OAuth or Email/Password. Your workspace will attach automatically with zero API key setup required.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 32px;background-color:#0D0D10;border-top:1px solid #1F1F23;font-size:11px;color:#71717A;line-height:1.5;">
                  <div>Button not working? Copy and paste this URL into your browser:</div>
                  <div style="color:#A3E635;word-break:break-all;margin-top:4px;font-family:monospace;">{login_link}</div>
                  <div style="margin-top:12px;color:#52525B;">
                    Sent securely by StarEleven AI Multi-Tenant Orchestration OS. If you did not expect this invitation, you may safely ignore this email.
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[{workspace_name}] You've been invited to join StarEleven AI ({role_upper})"
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
        return True, f"Executive invitation email sent to {recipient_email}!"
    except Exception as exc:
        logger.exception("Failed to send workspace invite email")
        return False, f"Member saved in database, but SMTP error occurred: {exc}"


@router.get("/{workspace_id}/members")
def list_workspace_members(workspace_id: str, db: Session = Depends(get_db)):
    _ensure_workspace_members_table(db)
    db.commit()

    owner_email, owner_name = _get_workspace_owner_email(db, workspace_id)

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

    members = []
    if owner_email:
        members.append(
            {
                "email": owner_email,
                "full_name": owner_name or "Workspace Owner",
                "role": "owner",
                "status": "active",
                "is_owner": True,
                "created_at": None,
            }
        )

    for r in rows:
        em = (r.user_email or "").strip().lower()
        if owner_email and em == owner_email:
            continue
        members.append(
            {
                "email": em,
                "full_name": None,
                "role": r.role,
                "status": r.status,
                "is_owner": False,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        )

    return {"members": members}


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
    if clean_role not in ("admin", "operator", "viewer"):
        clean_role = "operator"

    owner_email, _ = _get_workspace_owner_email(db, workspace_id)
    if owner_email and clean_email == owner_email:
        raise HTTPException(
            status_code=400,
            detail="This email belongs to the Workspace Owner and already has full access.",
        )

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
            "is_owner": False,
        },
    }


@router.delete("/{workspace_id}/members/{member_email}")
def remove_workspace_member(
    workspace_id: str,
    member_email: str,
    db: Session = Depends(get_db),
):
    clean_email = member_email.strip().lower()
    owner_email, _ = _get_workspace_owner_email(db, workspace_id)
    if owner_email and clean_email == owner_email:
        raise HTTPException(
            status_code=403,
            detail="Security Policy: The Workspace Owner cannot be removed.",
        )

    _ensure_workspace_members_table(db)
    db.execute(
        text(
            """
            DELETE FROM workspace_members
            WHERE workspace_id = CAST(:wid AS UUID)
              AND LOWER(user_email) = LOWER(CAST(:email AS VARCHAR))
            """
        ),
        {"wid": workspace_id, "email": clean_email},
    )
    db.commit()
    return {"ok": True}