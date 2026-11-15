"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bot,
  ShieldCheck,
  Wrench,
  Check,
  Loader2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { WorkspaceAgentItem, WorkspaceConnector } from "@/types/agents";

interface AgentBuilderModalProps {
  isOpen: boolean;
  editingAgent: WorkspaceAgentItem | null;
  workspaceId: string;
  workspaceName: string;
  connectors: WorkspaceConnector[];
  apiBaseUrl: string;
  onClose: () => void;
  onSaved: (agent: WorkspaceAgentItem, isNew: boolean) => void;
  onGoToConnectors: () => void;
}

const PROMPT_STARTERS = [
  {
    label: "Lead Qualifier",
    role: "Inbound Sales & Qualification Specialist",
    prompt:
      "You are a consultative B2B inbound qualification specialist. Greet prospects warmly, uncover their core workflow bottleneck, company size, and timeline, and recommend the right next step without being pushy.",
  },
  {
    label: "Research Analyst",
    role: "Market & Competitor Intelligence Analyst",
    prompt:
      "You are a senior market intelligence analyst. Search live web sources, verify facts, structure findings with clear executive bullet points, and highlight actionable revenue opportunities.",
  },
  {
    label: "Executive Ops",
    role: "Client Follow-Up & Scheduling Coordinator",
    prompt:
      "You are an executive operations coordinator. Draft concise, polite client emails, check calendar availability accurately, and summarize action items clearly before requesting approval to send.",
  },
];

export function AgentBuilderModal({
  isOpen,
  editingAgent,
  workspaceId,
  workspaceName,
  connectors,
  apiBaseUrl,
  onClose,
  onSaved,
  onGoToConnectors,
}: AgentBuilderModalProps) {
  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("Specialist Agent");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [boundTools, setBoundTools] = useState<string[]>([]);
  const [hitlEnabled, setHitlEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const connectedConnectors = connectors.filter((c) => c.is_connected);
  const unconnectedCount = connectors.length - connectedConnectors.length;

  useEffect(() => {
    if (!isOpen) return;
    if (editingAgent) {
      setName(editingAgent.name);
      setRoleTitle(editingAgent.role_title || "Specialist Agent");
      setSystemPrompt(editingAgent.system_prompt);
      setBoundTools(editingAgent.bound_tools || []);
      setHitlEnabled(Boolean(editingAgent.hitl_enabled));
    } else {
      setName("");
      setRoleTitle("Specialist Agent");
      setSystemPrompt("");
      setBoundTools([]);
      setHitlEnabled(true);
    }
    setErrorMsg(null);
  }, [isOpen, editingAgent]);

  if (!isOpen) return null;

  const toggleTool = (connectorId: string) => {
    setBoundTools((prev) =>
      prev.includes(connectorId)
        ? prev.filter((id) => id !== connectorId)
        : [...prev, connectorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !name.trim() || !systemPrompt.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const isEdit = Boolean(editingAgent);
      const url = isEdit
        ? `${apiBaseUrl}/api/v1/agents-studio/${workspaceId}/${editingAgent!.id}`
        : `${apiBaseUrl}/api/v1/agents-studio/create`;

      const bodyPayload = isEdit
        ? {
            name: name.trim(),
            role_title: roleTitle.trim() || "Specialist Agent",
            system_prompt: systemPrompt.trim(),
            bound_tools: boundTools,
            hitl_enabled: hitlEnabled,
          }
        : {
            workspace_id: workspaceId,
            name: name.trim(),
            role_title: roleTitle.trim() || "Specialist Agent",
            system_prompt: systemPrompt.trim(),
            bound_tools: boundTools,
            hitl_enabled: hitlEnabled,
          };

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Failed to save agent.");
      }

      onSaved(data.agent, !isEdit);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not save agent."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingAgent
                  ? `Configure ${editingAgent.name}`
                  : "Build Custom Specialist Agent"}
              </h2>
              <p className="text-xs text-zinc-400">
                Scoped to <span className="text-zinc-200">{workspaceName}</span>{" "}
                • Only verified connected tools can be attached
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto p-6"
        >
          {/* Quick Starter Presets (for new agents) */}
          {!editingAgent && (
            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
                <span>Quick-Fill Persona Starter:</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROMPT_STARTERS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (!name.trim()) setName(`${preset.label} Agent`);
                      setRoleTitle(preset.role);
                      setSystemPrompt(preset.prompt);
                    }}
                    className="rounded-lg border border-zinc-800 bg-[#121215] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Identity Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                Agent Name *
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Executive Outreach Copilot"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                Role Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior Sales & Calendar Coordinator"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
              />
            </div>
          </div>

          {/* System Instructions */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-300">
                System Instructions &amp; Operating Rules *
              </label>
              <span className="font-mono text-[10px] text-zinc-500">
                Auto-enriched with {workspaceName} Industry Context
              </span>
            </div>
            <textarea
              required
              minLength={10}
              rows={5}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define how this agent should think, respond, use tools, and escalate decisions..."
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] p-3.5 text-xs leading-relaxed text-zinc-100 placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          {/* Connected Tools Picker */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Wrench className="h-3.5 w-3.5 text-[#84CC16]" />
                <span>Bind Connected Tools ({boundTools.length} selected)</span>
              </label>
              {unconnectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToConnectors();
                  }}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[#A3E635] hover:underline"
                >
                  Connect {unconnectedCount} more tools
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {connectedConnectors.map((conn) => {
                const selected = boundTools.includes(conn.connector_id);
                return (
                  <button
                    key={conn.connector_id}
                    type="button"
                    onClick={() => toggleTool(conn.connector_id)}
                    className={`flex items-start justify-between gap-2.5 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-[#84CC16] bg-[#84CC16]/12 text-white"
                        : "border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold">
                          {conn.name}
                        </span>
                        {conn.requires_hitl && (
                          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                            HITL
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                        {(conn.cached_tools || conn.capabilities).join(", ")}
                      </p>
                    </div>

                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        selected
                          ? "border-[#84CC16] bg-[#84CC16] text-[#09090B]"
                          : "border-zinc-700 bg-zinc-900"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Human-in-the-Loop Safety Guard */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-[#09090B] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-amber-300">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Human-in-the-Loop (HITL) Execution Guard
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  Pause execution and ask for your explicit approval in chat
                  before sending Gmail messages, booking Calendar events, or
                  posting Slack/WhatsApp alerts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHitlEnabled((prev) => !prev)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                hitlEnabled ? "bg-[#84CC16]" : "bg-zinc-700"
              }`}
              aria-label="Toggle Human-in-the-Loop Guard"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#09090B] transition-transform ${
                  hitlEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-5 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Agent...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {editingAgent ? "Save Changes" : "Create Specialist Agent"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}