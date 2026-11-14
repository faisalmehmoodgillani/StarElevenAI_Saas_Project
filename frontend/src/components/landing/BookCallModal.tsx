"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  PhoneCall,
  Sparkles,
  X,
} from "lucide-react";

interface BookCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIndustry?: string;
}

const CALL_TYPES = [
  {
    id: "discovery",
    title: "15-Min Quick Discovery Call",
    subtitle: "See how StarEleven fits your business & team",
  },
  {
    id: "agency_demo",
    title: "30-Min Full Platform & Agency Demo",
    subtitle: "Live walkthrough of workspaces, AI agents & pricing",
  },
];

const TIME_SLOTS = [
  "11:00 AM (PKT / GMT+5)",
  "02:00 PM (PKT / GMT+5)",
  "05:00 PM (PKT / GMT+5)",
  "08:00 PM (PKT / GMT+5)",
];

export function BookCallModal({
  isOpen,
  onClose,
  defaultIndustry = "Agency",
}: BookCallModalProps) {
  const [callType, setCallType] = useState<string>("agency_demo");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [industry, setIndustry] = useState<string>(defaultIndustry);
  const [preferredDate, setPreferredDate] = useState<string>("");
  const [preferredSlot, setPreferredSlot] = useState<string>(TIME_SLOTS[1]);
  const [notes, setNotes] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedCallObj =
    CALL_TYPES.find((c) => c.id === callType) || CALL_TYPES[1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    onClose();
  };

  const mailtoSubject = encodeURIComponent(
    `Strategy Call Request: ${company || fullName} (${selectedCallObj.title})`
  );
  const mailtoBody = encodeURIComponent(
    `Hi StarEleven AI Team,\n\nI would like to confirm a strategy call:\n- Name: ${fullName}\n- Email: ${email}\n- Company: ${company}\n- Industry: ${industry}\n- Session: ${selectedCallObj.title}\n- Preferred Date: ${preferredDate || "Next Available"}\n- Preferred Time: ${preferredSlot}\n- Goals: ${notes || "General platform walkthrough"}\n`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={resetAndClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#84CC16] to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/35 bg-[#84CC16]/10 px-3 py-1 font-mono text-[11px] font-bold text-[#A3E635]">
              <PhoneCall className="h-3 w-3 text-[#84CC16]" />
              <span>1-ON-1 STRATEGY & DEMO CALL</span>
            </div>
            <h3 className="mt-2.5 text-xl font-extrabold text-white sm:text-2xl">
              Book a Call with StarEleven AI
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              No technical jargon — we&apos;ll show you how AI agents can save
              hours and qualify leads for your business.
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close modal"
            className="rounded-xl border border-zinc-800 bg-[#09090B] p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-2xl border border-[#84CC16]/40 bg-[#84CC16]/10 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#84CC16] text-[#09090B]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="mt-4 text-lg font-extrabold text-white">
              Your Call Request is Reserved!
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              Thank you, <strong>{fullName}</strong>. We have logged your{" "}
              <span className="text-[#A3E635]">{selectedCallObj.title}</span>{" "}
              for <strong>{preferredDate || "the next available slot"}</strong>{" "}
              at <strong>{preferredSlot}</strong>. Our team will send the
              Google Meet invite to <strong>{email}</strong>.
            </p>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={`mailto:hello@starelevenai.com?subject=${mailtoSubject}&body=${mailtoBody}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-4 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] sm:w-auto"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Send Instant Calendar Ping</span>
              </a>
              <button
                type="button"
                onClick={resetAndClose}
                className="w-full rounded-xl border border-zinc-700 bg-[#09090B] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:text-white sm:w-auto"
              >
                Back to Website
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Call Duration Type */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CALL_TYPES.map((item) => {
                const active = callType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCallType(item.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-[#84CC16] bg-[#84CC16]/15"
                        : "border-zinc-800 bg-[#09090B] hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        {item.title}
                      </span>
                      {active && (
                        <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {item.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmed Raza"
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmed@company.com"
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#84CC16]"
                />
              </div>
            </div>

            {/* Company & Business Industry */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Business / Agency Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Prime Properties"
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Your Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 text-xs text-white outline-none focus:border-[#84CC16]"
                >
                  <option value="Agency">Marketing / AI Agency</option>
                  <option value="Real Estate">Real Estate & Property</option>
                  <option value="E-Commerce">E-Commerce & Online Store</option>
                  <option value="Healthcare">Healthcare & Clinics</option>
                  <option value="Education">Education & Institutes</option>
                  <option value="SaaS">SaaS & Software</option>
                  <option value="Other">Other Business</option>
                </select>
              </div>
            </div>

            {/* Preferred Date & Time Slot */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <Calendar className="h-3.5 w-3.5 text-[#84CC16]" />
                  <span>Preferred Date *</span>
                </label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 text-xs text-white outline-none focus:border-[#84CC16]"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                  <Clock className="h-3.5 w-3.5 text-[#84CC16]" />
                  <span>Preferred Time</span>
                </label>
                <select
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 text-xs text-white outline-none focus:border-[#84CC16]"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Note */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                What would you like to automate? (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Qualify property buyers automatically, manage 5 client accounts, or connect our team..."
                className="w-full rounded-xl border border-zinc-800 bg-[#09090B] p-3 text-xs text-white placeholder-zinc-600 outline-none focus:border-[#84CC16]"
              />
            </div>

            <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-zinc-800 pt-4 sm:flex-row">
              <a
                href="mailto:hello@starelevenai.com"
                className="text-xs text-zinc-400 hover:text-[#A3E635]"
              >
                Or email{" "}
                <span className="underline">hello@starelevenai.com</span>
              </a>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-6 py-3 text-xs font-bold text-[#09090B] shadow-[0_0_24px_rgba(132,204,22,0.28)] transition hover:bg-[#A3E635] sm:w-auto"
              >
                <Calendar className="h-4 w-4" />
                <span>Confirm Strategy Call</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}