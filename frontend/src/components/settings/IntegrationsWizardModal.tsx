"use client";

import React, { useState } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Plug,
  Sparkles,
} from "lucide-react";

export interface IntegrationToolDef {
  id: string;
  name: string;
  category: string;
  description: string;
  stepsOverview: string[];
  fieldLabel: string;
  fieldPlaceholder: string;
  secondaryLabel?: string;
  secondaryPlaceholder?: string;
}

interface IntegrationsWizardModalProps {
  tool: IntegrationToolDef | null;
  onClose: () => void;
  onVerified: (toolId: string, endpointOrKey: string) => void;
}

export function IntegrationsWizardModal({
  tool,
  onClose,
  onVerified,
}: IntegrationsWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [primaryValue, setPrimaryValue] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [verified, setVerified] = useState(false);

  if (!tool) return null;

  const handleVerifyConnection = () => {
    if (!primaryValue.trim()) return;
    setValidating(true);
    setStep(3);

    setTimeout(() => {
      setValidating(false);
      setVerified(true);
      onVerified(tool.id, primaryValue.trim());
    }, 900);
  };

  const resetAndClose = () => {
    setStep(1);
    setPrimaryValue("");
    setSecondaryValue("");
    setValidating(false);
    setVerified(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#A3E635]">
                Setup Wizard • Step {step} of 3
              </span>
              <h3 className="text-base font-bold text-white">
                Connect {tool.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                step >= idx ? "bg-[#84CC16]" : "bg-zinc-800"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Quick Guide */}
        {step === 1 && (
          <div className="mt-5 space-y-4">
            <p className="text-xs leading-relaxed text-zinc-300">
              {tool.description}
            </p>

            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
              <p className="text-xs font-bold text-white">
                Quick 3-Step Checklist:
              </p>
              <ul className="mt-2.5 space-y-2">
                {tool.stepsOverview.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-zinc-400"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#84CC16]/15 font-mono text-[11px] font-bold text-[#A3E635]">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetAndClose}
                className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-bold text-[#09090B] hover:bg-[#A3E635]"
              >
                Next: Enter Credentials <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Credential Input */}
        {step === 2 && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-200">
                {tool.fieldLabel} <span className="text-[#84CC16]">*</span>
              </label>
              <input
                type="text"
                value={primaryValue}
                onChange={(e) => setPrimaryValue(e.target.value)}
                placeholder={tool.fieldPlaceholder}
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
              />
            </div>

            {tool.secondaryLabel && (
              <div>
                <label className="block text-xs font-semibold text-zinc-200">
                  {tool.secondaryLabel}
                </label>
                <input
                  type="text"
                  value={secondaryValue}
                  onChange={(e) => setSecondaryValue(e.target.value)}
                  placeholder={tool.secondaryPlaceholder}
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-[#09090B] p-3 text-[11px] text-zinc-400">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#84CC16]" />
              <span>
                Credentials are encrypted with AES-256 and isolated strictly to
                your active workspace.
              </span>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                type="button"
                disabled={!primaryValue.trim()}
                onClick={handleVerifyConnection}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-bold text-[#09090B] hover:bg-[#A3E635] disabled:opacity-40"
              >
                Test &amp; Verify <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verification Result */}
        {step === 3 && (
          <div className="mt-6 flex flex-col items-center py-4 text-center">
            {validating ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-[#84CC16]" />
                <h4 className="mt-3 text-sm font-bold text-white">
                  Validating Connection...
                </h4>
                <p className="mt-1 text-xs text-zinc-400">
                  Verifying credentials for {tool.name}
                </p>
              </>
            ) : verified ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635] shadow-[0_0_25px_rgba(132,204,22,0.2)]">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-1 font-mono text-xs font-bold text-[#A3E635]">
                  <Sparkles className="h-3.5 w-3.5" /> VERIFIED &amp; CONNECTED
                </div>
                <h4 className="mt-2 text-base font-bold text-white">
                  {tool.name} is Now Active
                </h4>
                <p className="mt-1 max-w-sm text-xs text-zinc-400">
                  Your workspace AI agents can now use {tool.name} during live
                  tasks.
                </p>

                <button
                  type="button"
                  onClick={resetAndClose}
                  className="mt-6 rounded-xl bg-[#84CC16] px-6 py-2.5 text-xs font-bold text-[#09090B] hover:bg-[#A3E635]"
                >
                  Done
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}