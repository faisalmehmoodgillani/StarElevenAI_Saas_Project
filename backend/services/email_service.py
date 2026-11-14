import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()


def send_managed_plan_request_alert(
    workspace_id: str,
    workspace_name: str,
    workspace_slug: str,
    requester_email: str = "Unknown",
) -> bool:
    """Sends an email notification to Super-Admin when a workspace requests Managed Plan."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    admin_emails_raw = os.getenv("SUPER_ADMIN_EMAILS", smtp_user)

    recipients = [e.strip() for e in admin_emails_raw.split(",") if e.strip()]
    if not smtp_user or not smtp_password or not recipients:
        return False

    subject = f"[StarEleven AI] New Managed Plan Request: {workspace_name}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; background:#09090B; color:#F4F4F5; padding:24px; border-radius:12px; border:1px solid #27272A;">
      <h2 style="color:#84CC16; margin-top:0;">New Managed Plan Approval Request</h2>
      <p style="color:#D4D4D8;">A client workspace has requested access to StarEleven Fully Managed AI Cloud:</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:13px;">
        <tr><td style="padding:8px; color:#A1A1AA;">Workspace Name:</td><td style="padding:8px; color:#FFF; font-weight:bold;">{workspace_name}</td></tr>
        <tr><td style="padding:8px; color:#A1A1AA;">Workspace Slug:</td><td style="padding:8px; color:#A3E635;">/{workspace_slug}</td></tr>
        <tr><td style="padding:8px; color:#A1A1AA;">Workspace ID:</td><td style="padding:8px; font-family:monospace;">{workspace_id}</td></tr>
        <tr><td style="padding:8px; color:#A1A1AA;">Requester:</td><td style="padding:8px;">{requester_email}</td></tr>
      </table>
      <a href="http://localhost:3000/admin" style="display:inline-block; background:#84CC16; color:#09090B; font-weight:bold; padding:10px 20px; border-radius:8px; text-decoration:none;">
        Review &amp; Approve in Admin Console
      </a>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, recipients, msg.as_string())
        return True
    except Exception as exc:
        print(f"[EmailAlert] Could not send admin notification: {exc}")
        return False