"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  Mail,
  Building2,
  User,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface TimeSlotItem {
  id: string;
  label: string;
  tag: string;
  is_booked: boolean;
}

interface BookCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIndustry?: string;
}

function mapIndustryToOption(raw?: string): string {
  if (!raw) return "agency";
  const val = raw.toLowerCase();
  if (val.includes("real")) return "real_estate";
  if (val.includes("comm") || val.includes("d2c") || val.includes("retail")) {
    return "ecommerce";
  }
  if (val.includes("health") || val.includes("clinic") || val.includes("med")) {
    return "healthcare";
  }
  if (val.includes("edu") || val.includes("academy") || val.includes("school")) {
    return "education";
  }
  if (val.includes("saas") || val.includes("tech") || val.includes("software")) {
    return "saas";
  }
  if (val.includes("agency") || val.includes("consult")) return "agency";
  return "other";
}

const RAW_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000"
)
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

const FALLBACK_SLOTS: TimeSlotItem[] = [
  { id: "11:00 AM", label: "11:00 AM", tag: "Morning Executive", is_booked: false },
  { id: "02:30 PM", label: "02:30 PM", tag: "Afternoon Strategy", is_booked: false },
  { id: "05:00 PM", label: "05:00 PM", tag: "Evening Operations", is_booked: false },
  { id: "08:30 PM", label: "08:30 PM", tag: "Global / Remote", is_booked: false },
];

export function BookCallModal({
  isOpen,
  onClose,
  defaultIndustry,
}: BookCallModalProps) {
  const todayStr = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [bookingDate, setBookingDate] = useState<string>(todayStr);
  const [slots, setSlots] = useState<TimeSlotItem[]>(FALLBACK_SLOTS);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState(() =>
    mapIndustryToOption(defaultIndustry)
  );
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedData, setConfirmedData] = useState<{
    date: string;
    slot: string;
  } | null>(null);

  const fetchSlotsForDate = async (targetDate: string) => {
    setLoadingSlots(true);
    setErrorMsg("");
    try {
      const res = await fetch(
        `${RAW_API_URL}/api/v1/bookings/slots?booking_date=${targetDate}`
      );
      if (!res.ok) throw new Error("Unable to fetch live slots.");
      const data = await res.json();
      const fetchedSlots: TimeSlotItem[] = data.slots || FALLBACK_SLOTS;
      setSlots(fetchedSlots);

      const stillFree = fetchedSlots.some(
        (s) => s.id === selectedSlot && !s.is_booked
      );
      if (!stillFree) {
        setSelectedSlot("");
      }
    } catch {
      setSlots(FALLBACK_SLOTS);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setConfirmedData(null);
    setErrorMsg("");
    if (defaultIndustry) {
      setIndustry(mapIndustryToOption(defaultIndustry));
    }
    fetchSlotsForDate(bookingDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingDate, defaultIndustry]);

  if (!isOpen) return null;

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMsg("Please select an available time slot.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${RAW_API_URL}/api/v1/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          company_name: companyName.trim() || null,
          industry,
          booking_date: bookingDate,
          time_slot: selectedSlot,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          await fetchSlotsForDate(bookingDate);
        }
        throw new Error(data.detail || "Could not complete your booking.");
      }

      setSlots((prev) =>
        prev.map((s) =>
          s.id === selectedSlot ? { ...s, is_booked: true } : s
        )
      );
      setConfirmedData({ date: bookingDate, slot: selectedSlot });
      setSelectedSlot("");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to schedule call."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#18181B] p-6 shadow-2xl sm:p-8">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#A3E635]">
              1-on-1 Architecture Call
            </span>
            <h3 className="mt-2 text-xl font-bold text-white">
              Book a Strategy &amp; Demo Session
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Select an open time slot below. Booked slots lock automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-800 bg-[#09090B] p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {confirmedData ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h4 className="mt-4 text-lg font-bold text-white">
              Strategy Call Confirmed
            </h4>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
              We have locked{" "}
              <span className="font-semibold text-[#A3E635]">
                {confirmedData.slot}
              </span>{" "}
              on{" "}
              <span className="font-semibold text-white">
                {confirmedData.date}
              </span>{" "}
              and sent a confirmation email to{" "}
              <span className="text-zinc-200">{email}</span>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-xl bg-[#84CC16] px-6 py-2.5 text-sm font-bold text-[#09090B] transition hover:bg-[#A3E635]"
            >
              Back to StarEleven AI
            </button>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="mt-5 space-y-4">
            {/* Date Picker */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Calendar className="h-3.5 w-3.5 text-[#84CC16]" />
                Select Date
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-sm text-white focus:border-[#84CC16] focus:outline-none"
              />
            </div>

            {/* 4 Professional Time Slots */}
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-[#84CC16]" />
                  Select Time Slot (PKT / UTC+5)
                </label>
                {loadingSlots && (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
                    <Loader2 className="h-3 w-3 animate-spin text-[#84CC16]" />
                    Syncing slots...
                  </span>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {slots.map((slot) => {
                  const isSelected = selectedSlot === slot.id && !slot.is_booked;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={slot.is_booked || loadingSlots}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
                        slot.is_booked
                          ? "cursor-not-allowed border-zinc-800/70 bg-[#09090B]/50 opacity-55"
                          : isSelected
                          ? "border-[#84CC16] bg-[#84CC16]/15 text-white"
                          : "border-zinc-800 bg-[#09090B] text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      <div>
                        <div
                          className={`font-mono text-sm font-bold ${
                            slot.is_booked
                              ? "line-through text-zinc-500"
                              : isSelected
                              ? "text-[#A3E635]"
                              : "text-white"
                          }`}
                        >
                          {slot.label}
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          {slot.tag}
                        </div>
                      </div>

                      {slot.is_booked ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-rose-400">
                          <Lock className="h-2.5 w-2.5" />
                          Booked
                        </span>
                      ) : (
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                            isSelected
                              ? "bg-[#84CC16] text-[#09090B]"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {isSelected ? "Selected" : "Available"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Faisal Shah"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@company.com"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                  <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                  Company / Agency Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="StarEleven Solutions"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Business Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 text-sm text-white focus:border-[#84CC16] focus:outline-none"
                >
                  <option value="agency">Agency &amp; Consulting</option>
                  <option value="real_estate">Real Estate &amp; Property</option>
                  <option value="ecommerce">E-commerce &amp; D2C</option>
                  <option value="healthcare">Healthcare &amp; Clinics</option>
                  <option value="education">Education &amp; EdTech</option>
                  <option value="saas">SaaS &amp; B2B Tech</option>
                  <option value="other">Other Vertical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                What would you like to automate? (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us about your team size, client workspaces, or custom agents..."
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedSlot}
                className="inline-flex items-center gap-2 rounded-xl bg-[#84CC16] px-5 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Confirming Slot..." : "Confirm & Lock Time Slot"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}