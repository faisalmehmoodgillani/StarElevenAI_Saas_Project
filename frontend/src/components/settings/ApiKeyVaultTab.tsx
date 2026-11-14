"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  KeyRound,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Loader2,
  Save,
  Clock,
  Server,
  AlertCircle,
} from "lucide-react";

interface ProviderVaultItem {
  id: "groq" | "google" | "openai" | "anthropic" | "openrouter";
  name: string;
  subtitle: string;
  placeholder: string;
  badge: string;
  defaultModel: string;
}

const LLM_PROVIDERS: ProviderVaultItem[] = [
  {
    id: "groq",
    name: "Groq LPU Cloud",
    subtitle: "Ultra-fast inference (GPT-OSS 20B / 120B, Qwen 3, Kimi K2)",
    placeholder: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Fastest",
    defaultModel: "openai/gpt-oss-20b",
  },
  {
    id: "google",
    name: "Google Gemini AI",
    subtitle: "Gemini 2.5 Flash & Gemini 2.5 Pro multimodal reasoning",
    placeholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Multimodal",
    defaultModel: "gemini-2.5-flash",
  },
  {
    id: "openai",
    name: "OpenAI Platform",
    subtitle: "GPT-4o, GPT-4o-mini & structured enterprise tool calling",
    placeholder: "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Enterprise",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    subtitle: "Claude Sonnet 4.5 high-precision coding & analysis",
    placeholder: "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Reasoning",
    defaultModel: "claude-sonnet-4-5",
  },
  {
    id: "openrouter",
    name: "OpenRouter Gateway",
    subtitle: "Unified fallback routing across 100+ open & frontier models",
    placeholder: "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Multi-Model",
    defaultModel: "openai/gpt-oss-20b:free",
  },
];

interface ApiKeyVaultTabProps {
  workspaceId: string;
  userEmail?: string;
  planMode: string;
  managedApproved: boolean;
  managedRequestStatus: string;
  onPlanStateUpdated: (updated: {
    plan_mode: "managed" | "byok";
    managed_approved: boolean;
    managed_request_status: string;
  }) => Promise<void>;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function ApiKeyVaultTab({
  workspaceId,
  userEmail,
  planMode,
  managedApproved,
  managedRequestStatus,
  onPlanStateUpdated,
}: ApiKeyVaultTabProps) {
  const [activeMode, setActiveMode] = useState<"managed" | "byok">(
    planMode?.toLowerCase() === "managed" && managedApproved
      ? "managed"
      : "byok"
  );
  const [isApproved, setIsApproved] = useState<boolean>(managedApproved);
  const [requestStatus, setRequestStatus] = useState<string>(
    managedRequestStatus || "none"
  );

  useEffect(() => {
    setIsApproved(managedApproved);
    setRequestStatus(managedRequestStatus || "none");
    if (planMode?.toLowerCase() === "managed" && managedApproved) {
      setActiveMode("managed");
    } else {
      setActiveMode("byok");
    }
  }, [planMode, managedApproved, managedRequestStatus]);

  const isManagedActive = activeMode === "managed" && isApproved;
  const isByokActive = !isManagedActive;

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [savedProviders, setSavedProviders] = useState<Record<string, boolean>>(
    {}
  );
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [vaultBanner, setVaultBanner] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  const handleSelectByok = async () => {
    if (isByokActive || switchingMode || !workspaceId) return;
    setSwitchingMode(true);
    setVaultBanner(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(userEmail ? { "X-User-Email": userEmail } : {}),
          },
          body: JSON.stringify({ plan_mode: "byok" }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail || `Server error (${res.status}) switching to BYOK.`
        );
      }

      setActiveMode("byok");
      await onPlanStateUpdated({
        plan_mode: "byok",
        managed_approved: isApproved,
        managed_request_status: requestStatus,
      });
      setVaultBanner({
        type: "success",
        text: "BYOK Mode is now ACTIVE. Enter your own LLM API keys below.",
      });
    } catch (err: unknown) {
      setVaultBanner({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to switch mode.",
      });
    } finally {
      setSwitchingMode(false);
    }
  };

  const handleSelectManaged = async () => {
    if (isManagedActive || switchingMode || !workspaceId) return;
    setSwitchingMode(true);
    setVaultBanner(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(userEmail ? { "X-User-Email": userEmail } : {}),
          },
          body: JSON.stringify({ plan_mode: "managed" }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail ||
            `Server returned ${res.status}. Restart FastAPI backend if routes were just updated.`
        );
      }

      const data = await res.json();
      const approvedNow = Boolean(data.managed_approved);
      const statusNow = data.managed_request_status || "pending";

      setIsApproved(approvedNow);
      setRequestStatus(statusNow);

      if (approvedNow) {
        setActiveMode("managed");
        await onPlanStateUpdated({
          plan_mode: "managed",
          managed_approved: true,
          managed_request_status: "approved",
        });
        setVaultBanner({
          type: "success",
          text: "Fully Managed Plan is now ACTIVE. Your agents run on StarEleven cloud infrastructure.",
        });
      } else {
        setActiveMode("byok");
        await onPlanStateUpdated({
          plan_mode: "byok",
          managed_approved: false,
          managed_request_status: statusNow,
        });
        setVaultBanner({
          type: "warning",
          text: "Managed Plan request submitted! Admin has been notified via email. Your workspace remains on BYOK until approved.",
        });
      }
    } catch (err: unknown) {
      setVaultBanner({
        type: "error",
        text: err instanceof Error ? err.message : "Request failed.",
      });
    } finally {
      setSwitchingMode(false);
    }
  };

  const handleSaveKey = async (provider: ProviderVaultItem) => {
    const rawKey = keys[provider.id]?.trim();
    if (!rawKey || !workspaceId) return;

    setSavingProvider(provider.id);
    setVaultBanner(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          agent_type: `${provider.id}_vault_key`,
          provider: provider.id,
          model_name: provider.defaultModel,
          api_key: rawKey,
          settings_json: {
            vault_provider: provider.id,
            encrypted_via: "AES-256-Fernet",
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to encrypt and save API key.");
      }

      setSavedProviders((prev) => ({ ...prev, [provider.id]: true }));
      setKeys((prev) => ({ ...prev, [provider.id]: "" }));
      setVaultBanner({
        type: "success",
        text: `${provider.name} API key encrypted with AES-256 and saved to your workspace.`,
      });
    } catch (err: unknown) {
      setVaultBanner({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not store key. Check backend connection.",
      });
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection Cards */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-white">
              AI Execution &amp; Billing Mode
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Use your own API keys immediately via BYOK, or request an approved
              StarEleven Managed subscription.
            </p>
          </div>
          {switchingMode && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#A3E635]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating...
            </span>
          )}
        </div>

        {vaultBanner && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium ${
              vaultBanner.type === "success"
                ? "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635]"
                : vaultBanner.type === "warning"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-rose-500/40 bg-rose-500/10 text-rose-300"
            }`}
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{vaultBanner.text}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Card 1: BYOK */}
          <button
            type="button"
            onClick={handleSelectByok}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
              isByokActive
                ? "border-[#84CC16] bg-[#84CC16]/10 shadow-[0_0_20px_rgba(132,204,22,0.12)]"
                : "border-zinc-800 bg-[#09090B] hover:border-zinc-700"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">
                  BYOK (Bring Your Own Key)
                </span>
                {isByokActive && (
                  <span className="rounded-full bg-[#84CC16] px-2.5 py-0.5 text-[10px] font-bold text-[#09090B]">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Supply your own Groq, Gemini, OpenAI, Claude, or OpenRouter API
                keys. Encrypted with AES-256 and ready immediately.
              </p>
            </div>
          </button>

          {/* Card 2: Fully Managed */}
          <button
            type="button"
            onClick={handleSelectManaged}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
              isManagedActive
                ? "border-[#84CC16] bg-[#84CC16]/10 shadow-[0_0_20px_rgba(132,204,22,0.12)]"
                : requestStatus === "pending"
                ? "border-amber-500/50 bg-amber-500/5"
                : "border-zinc-800 bg-[#09090B] hover:border-zinc-700"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-[#A3E635]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white">
                  Fully Managed Plan
                </span>
                {isManagedActive ? (
                  <span className="rounded-full bg-[#84CC16] px-2.5 py-0.5 text-[10px] font-bold text-[#09090B]">
                    ACTIVE
                  </span>
                ) : requestStatus === "pending" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                    <Clock className="h-3 w-3" /> Pending Approval
                  </span>
                ) : isApproved ? (
                  <span className="rounded-full border border-[#84CC16]/40 bg-[#84CC16]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#A3E635]">
                    Approved — Click to Activate
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                    Request Access
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Zero API key management. Run agents directly on StarEleven&apos;s
                enterprise cloud pool once your workspace plan is approved.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Conditional View: Managed Active vs BYOK Vault */}
      {isManagedActive ? (
        <div className="rounded-2xl border border-[#84CC16]/30 bg-[#121215] p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  StarEleven Managed AI Cloud is Active
                </h3>
                <span className="rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                  NO KEYS NEEDED
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                All AI models (Groq GPT-OSS 20B/120B, Qwen 3, Kimi K2, and
                Gemini 2.5) are provisioned automatically for this workspace.
                Switch to BYOK anytime if you prefer using your own API keys.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  BYOK Model Provider Keys (AES-256 Vault)
                </h3>
                <p className="text-xs text-zinc-400">
                  Add your own LLM provider keys below. External tools (Web
                  Search, WhatsApp, MCP) are configured in{" "}
                  <strong className="text-zinc-200">Tools &amp; MCP</strong>.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-1.5 font-mono text-[11px] text-zinc-300">
              <Lock className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>AES-256 Encrypted</span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {LLM_PROVIDERS.map((item) => {
              const isVisible = !!visibleKeys[item.id];
              const isSaved = !!savedProviders[item.id];
              const isSaving = savingProvider === item.id;

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#09090B] p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-zinc-100">
                        {item.name}
                      </span>
                      {isSaved ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2 py-0.5 text-[10px] font-semibold text-[#A3E635]">
                          <CheckCircle2 className="h-3 w-3" /> Encrypted &amp; Saved
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{item.subtitle}</p>
                  </div>

                  <div className="mt-3.5 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? "text" : "password"}
                        value={keys[item.id] || ""}
                        onChange={(e) =>
                          setKeys({ ...keys, [item.id]: e.target.value })
                        }
                        placeholder={
                          isSaved
                            ? "•••••••••••••••••••• (Encrypted in Vault)"
                            : item.placeholder
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-[#121215] py-2 pl-3 pr-9 font-mono text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleKeys({
                            ...visibleKeys,
                            [item.id]: !isVisible,
                          })
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        aria-label="Toggle key visibility"
                      >
                        {isVisible ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!keys[item.id]?.trim() || isSaving}
                      onClick={() => handleSaveKey(item)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#84CC16] px-3.5 py-2 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}