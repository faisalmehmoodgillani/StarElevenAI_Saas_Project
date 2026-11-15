"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
} from "lucide-react";
import { HitlInterruptPayload } from "@/types/agents";

interface HitlApprovalCardProps {
  interrupt: HitlInterruptPayload;
  resolution?: "approved" | "rejected" | null;
  onDecision: (approved: boolean) => Promise<void>;
}

export function HitlApprovalCard({
  interrupt,
  resolution,
  onDecision,
}: HitlApprovalCardProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (approved: boolean) => {
    if (submitting || resolution) return;
    setSubmitting(true);
    try {
      await onDecision(approved);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-500/45 bg-gradient-to-br from-amber-500/15 via-[#121215] to-[#09090B] p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
              Human-in-the-Loop Guard • {interrupt.agent_name}
            </span>
            <h4 className="text-xs font-bold text-white">
              {interrupt.message || "Approval Required Before External Action"}
            </h4>
          </div>
        </div>

        {resolution && (
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
              resolution === "approved"
                ? "border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]"
                : "border border-rose-500/40 bg-rose-500/15 text-rose-300"
            }`}
          >
            {resolution === "approved" ? "Approved & Sent" : "Declined"}
          </span>
        )}
      </div>

      {/* Action Payload Preview */}
      <div className="mt-3 space-y-2">
        {interrupt.actions.map((act, idx) => (
          <div
            key={act.id || idx}
            className="rounded-lg border border-zinc-800 bg-[#09090B] p-3 font-mono text-[11px]"
          >
            <div className="flex items-center gap-1.5 text-amber-300">
              <Terminal className="h-3 w-3" />
              <span className="font-bold">{act.name}</span>
            </div>
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-300">
              {JSON.stringify(act.args, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      {/* Approve / Reject Controls */}
      {!resolution && (
        <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject Action
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleAction(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-1.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve &amp; Execute
          </button>
        </div>
      )}
    </div>
  );
}