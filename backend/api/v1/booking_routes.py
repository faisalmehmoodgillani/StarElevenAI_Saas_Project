import os
import smtplib
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.database.session import get_db

router = APIRouter(prefix="/bookings", tags=["Call Bookings"])

# 4 Fixed Professional Executive Time Slots
PROFESSIONAL_SLOTS = [
    {
        "id": "11:00 AM",
        "label": "11:00 AM",
        "tag": "Morning Executive",
    },
    {
        "id": "02:30 PM",
        "label": "02:30 PM",
        "tag": "Afternoon Strategy",
    },
    {
        "id": "05:00 PM",
        "label": "05:00 PM",
        "tag": "Evening Operations",
    },
    {
        "id": "08:30 PM",
        "label": "08:30 PM",
        "tag": "Global / Remote",
    },
]

VALID_SLOT_IDS = {s["id"] for s in PROFESSIONAL_SLOTS}


class CreateBookingRequest(BaseModel):
    full_name: str
    email: EmailStr
    company_name: Optional[str] = None
    industry: Optional[str] = "agency"
    booking_date: date
    time_slot: str
    notes: Optional[str] = None


def _send_smtp_email(to_email: str, subject: str, html_body: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL")
    smtp_pass = os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_APP_PASSWORD")

    if not smtp_user or not smtp_pass or not to_email:
        return False

    msg = MIMEMultipart("alternative")
    msg["From"] = f"StarEleven AI <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [to_email], msg.as_string())
        return True
    except Exception as exc:
        print(f"[Booking Email Warning] Failed to send email to {to_email}: {exc}")
        return False


def _notify_admin_and_client(payload: CreateBookingRequest) -> None:
    admin_raw = os.getenv("SUPER_ADMIN_EMAILS") or os.getenv("SMTP_USER") or os.getenv("SMTP_EMAIL") or ""
    admin_emails = [e.strip() for e in admin_raw.split(",") if e.strip()]

    formatted_date = payload.booking_date.strftime("%A, %d %B %Y")
    company_display = payload.company_name.strip() if payload.company_name else "Not specified"
    notes_display = payload.notes.strip() if payload.notes else "No additional notes provided."

    # 1. Admin Alert Email
    admin_html = f"""
    <div style="font-family: Arial, sans-serif; background-color: #09090B; color: #F4F4F5; padding: 28px; border-radius: 12px; border: 1px solid #27272A; max-width: 600px;">
      <div style="display: inline-block; background-color: rgba(132, 204, 22, 0.15); color: #A3E635; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">
        NEW STRATEGY CALL BOOKED
      </div>
      <h2 style="margin: 16px 0 8px; color: #FFFFFF;">Strategy Demo Request — StarEleven AI</h2>
      <p style="color: #A1A1AA; font-size: 14px; margin-bottom: 20px;">
        A prospect has locked a time slot from the StarEleven AI landing page.
      </p>
      <table style="width: 100%; border-collapse: collapse; background-color: #18181B; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #A1A1AA; font-size: 13px;">Client Name</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #FFFFFF; font-weight: bold; font-size: 13px;">{payload.full_name}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #A1A1AA; font-size: 13px;">Work Email</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #A3E635; font-weight: bold; font-size: 13px;">{payload.email}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #A1A1AA; font-size: 13px;">Company / Agency</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #FFFFFF; font-size: 13px;">{company_display} ({payload.industry})</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #A1A1AA; font-size: 13px;">Scheduled Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #FFFFFF; font-weight: bold; font-size: 13px;">{formatted_date}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #A1A1AA; font-size: 13px;">Locked Time Slot</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #27272A; color: #A3E635; font-weight: bold; font-size: 14px;">{payload.time_slot} (PKT / UTC+5)</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #A1A1AA; font-size: 13px;">Project Notes</td>
          <td style="padding: 12px 16px; color: #E4E4E7; font-size: 13px;">{notes_display}</td>
        </tr>
      </table>
    </div>
    """

    for admin_email in admin_emails:
        _send_smtp_email(
            admin_email,
            f"New Call Booked: {payload.full_name} ({formatted_date} @ {payload.time_slot})",
            admin_html,
        )

    # 2. Client Confirmation Email
    client_html = f"""
    <div style="font-family: Arial, sans-serif; background-color: #09090B; color: #F4F4F5; padding: 28px; border-radius: 12px; border: 1px solid #27272A; max-width: 600px;">
      <div style="display: inline-block; background-color: rgba(132, 204, 22, 0.15); color: #A3E635; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: bold;">
        BOOKING CONFIRMED
      </div>
      <h2 style="margin: 16px 0 8px; color: #FFFFFF;">Your StarEleven AI Strategy Call is Locked</h2>
      <p style="color: #A1A1AA; font-size: 14px; line-height: 1.6;">
        Hi <strong style="color: #FFFFFF;">{payload.full_name}</strong>, thank you for scheduling a session with StarEleven AI. Your time slot has been reserved exclusively for you:
      </p>
      <div style="background-color: #18181B; border: 1px solid #27272A; border-radius: 10px; padding: 16px; margin: 18px 0;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #A1A1AA;">Date: <strong style="color: #FFFFFF;">{formatted_date}</strong></p>
        <p style="margin: 0; font-size: 14px; color: #A1A1AA;">Time Slot: <strong style="color: #A3E635;">{payload.time_slot} (PKT / UTC+5)</strong></p>
      </div>
      <p style="color: #A1A1AA; font-size: 13px; line-height: 1.5;">
        Our solutions architect will send your meeting link ahead of the session. Reply directly to this email if you need to reschedule.
      </p>
    </div>
    """

    _send_smtp_email(
        payload.email,
        f"Confirmed: StarEleven AI Strategy Call ({formatted_date} at {payload.time_slot})",
        client_html,
    )


@router.get("/slots")
def get_available_slots(
    booking_date: date = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        text(
            """
            SELECT time_slot
            FROM call_bookings
            WHERE booking_date = :booking_date
              AND status != 'cancelled'
            """
        ),
        {"booking_date": booking_date},
    ).fetchall()

    booked_set = {row.time_slot for row in rows}

    slots_response = [
        {
            "id": slot["id"],
            "label": slot["label"],
            "tag": slot["tag"],
            "is_booked": slot["id"] in booked_set,
        }
        for slot in PROFESSIONAL_SLOTS
    ]

    return {
        "booking_date": str(booking_date),
        "timezone": "PKT (UTC+5)",
        "slots": slots_response,
    }


@router.post("", status_code=201)
def create_booking(
    payload: CreateBookingRequest,
    db: Session = Depends(get_db),
):
    if payload.booking_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Past dates cannot be booked. Please select today or an upcoming date.",
        )

    if payload.time_slot not in VALID_SLOT_IDS:
        raise HTTPException(
            status_code=400,
            detail="Invalid time slot selected. Please choose one of the 4 official slots.",
        )

    if not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required.")

    try:
        db.execute(
            text(
                """
                INSERT INTO call_bookings (
                    full_name, email, company_name, industry, booking_date, time_slot, notes, status
                )
                VALUES (
                    :full_name, :email, :company_name, :industry, :booking_date, :time_slot, :notes, 'confirmed'
                )
                """
            ),
            {
                "full_name": payload.full_name.strip(),
                "email": payload.email.strip().lower(),
                "company_name": (payload.company_name or "").strip() or None,
                "industry": (payload.industry or "agency").strip(),
                "booking_date": payload.booking_date,
                "time_slot": payload.time_slot,
                "notes": (payload.notes or "").strip() or None,
            },
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"The {payload.time_slot} slot on {payload.booking_date} was just booked by another user. Please choose another available slot.",
        )

    _notify_admin_and_client(payload)

    return {
        "status": "confirmed",
        "message": "Your strategy call is booked and confirmation email has been sent.",
        "booking_date": str(payload.booking_date),
        "time_slot": payload.time_slot,
    }