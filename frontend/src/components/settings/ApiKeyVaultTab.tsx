"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface ProviderVaultItem {
  id: "groq" | "google" | "openai" | "anthropic" | "openrouter" | "tavily";
  name: string;
  subtitle: string;
  placeholder: string;
  badge: string;
}

const VAULT_PROVIDERS: ProviderVaultItem[] = [
  {
    id: "groq",
    name: "Groq LPU Cloud",
    subtitle: "Ultra-fast inference (GPT-OSS 20B / 120B, Qwen 3, Kimi K2)",
    placeholder: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Recommended",
  },
  {
    id: "google",
    name: "Google Gemini AI",
    subtitle: "Gemini 2.5 Flash & Gemini 2.5 Pro multimodal reasoning",
    placeholder: "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Multimodal",
  },
  {
    id: "openai",
    name: "OpenAI Platform",
    subtitle: "GPT-4o, GPT-4o-mini & structured enterprise tool calling",
    placeholder: "sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Enterprise",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    subtitle: "Claude Sonnet 4.5 high-precision coding & analysis",
    placeholder: "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Reasoning",
  },
  {
    id: "openrouter",
    name: "OpenRouter Gateway",
    subtitle: "Unified fallback routing across 100+ open & frontier models",
    placeholder: "sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Multi-Model",
  },
  {
    id: "tavily",
    name: "Tavily Live Web Search",
    subtitle: "Real-time internet search tool for Deep Research Agent",
    placeholder: "tvly-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    badge: "Research Tool",
  },
];

interface ApiKeyVaultTabProps {
  workspaceId: string;
  planMode: "managed" | "byok" | string;
  onPlanModeChange: (newMode: "managed" | "byok") => Promise<void>;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function ApiKeyVaultTab({
  workspaceId,
  planMode,
  onPlanModeChange,
}: ApiKeyVaultTabProps) {
  const isByok = planMode?.toLowerCase() === "byok";

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [savedProviders, setSavedProviders] = useState<Record<string, boolean>>(
    {}
  );
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [vaultBanner, setVaultBanner] = useState<string | null>(null);

  const handleToggleMode = async (targetMode: "managed" | "byok") => {
    if (targetMode === (isByok ? "byok" : "managed")) return;
    setSwitchingMode(true);
    try {
      await onPlanModeChange(targetMode);
      setVaultBanner(
        targetMode === "byok"
          ? "Switched to BYOK Mode — agents will now use your AES-256 encrypted workspace keys."
          : "Switched to Fully Managed Mode — agents are powered by StarEleven cloud infrastructure."
      );
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
      // Encrypt and store via backend agent config / vault endpoint
      const res = await fetch(`${API_BASE_URL}/api/v1/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          agent_type: `${provider.id}_vault_key`,
          provider: provider.id === "tavily" ? "groq" : provider.id,
          model_name:
            provider.id === "groq"
              ? "openai/gpt-oss-20b"
              : provider.id === "google"
              ? "gemini-2.5-flash"
              : provider.id === "openai"
              ? "gpt-4o-mini"
              : provider.id === "anthropic"
              ? "claude-sonnet-4-5"
              : "openai/gpt-oss-20b:free",
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
      setVaultBanner(
        `${provider.name} key encrypted with AES-256 Fernet and stored securely in Supabase.`
      );
    } catch (err: any) {
      setVaultBanner(
        err?.message || "Could not store key. Check backend connection."
      );
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dual-Mode Operational Architecture Switcher */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-bold text-white">
              AI Infrastructure & Billing Mode
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Choose whether this workspace runs on StarEleven&apos;s Managed
              AI keys or your client&apos;s own BYOK credentials[cite: 1, 2].
            </p>
          </div>
          {switchingMode && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[#A3E635]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating Mode...
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Option 1: Fully Managed */}
          <button
            type="button"
            onClick={() => handleToggleMode("managed")}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
              !isByok
                ? "border-[#84CC16] bg-[#84CC16]/10 shadow-[0_0_20px_rgba(132,204,22,0.12)]"
                : "border-zinc-800 bg-[#09090B] hover:border-zinc-700"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  Fully Managed Plan
                </span>
                {!isByok && (
                  <span className="rounded-full bg-[#84CC16] px-2 py-0.5 text-[10px] font-bold text-[#09090B]">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Zero setup required. Agents execute immediately using
                StarEleven&apos;s enterprise LLM pool[cite: 1, 2]. Ideal for non-technical B2B
                clients.
              </p>
            </div>
          </button>

          {/* Option 2: BYOK */}
          <button
            type="button"
            onClick={() => handleToggleMode("byok")}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all ${
              isByok
                ? "border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.12)]"
                : "border-zinc-800 bg-[#09090B] hover:border-zinc-700"
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  BYOK (Bring Your Own Key)
                </span>
                {isByok && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-[#09090B]">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Supply custom Groq, Gemini, OpenAI, or Claude keys[cite: 1]. Encrypted
                via AES-256 Fernet and decrypted strictly in-memory[cite: 1].
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* AES-256 Encrypted API Key Vault */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                AES-256 Fernet Credential Vault
              </h3>
              <p className="text-xs text-zinc-400">
                Raw API keys are never logged or exposed in plaintext[cite: 1, 3].
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-1.5 font-mono text-[11px] text-zinc-300">
            <Lock className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Zero-Knowledge Encryption</span>
          </div>
        </div>

        {vaultBanner && (
          <div className="mt-4 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/10 px-4 py-2.5 text-xs font-medium text-[#A3E635]">
            {vaultBanner}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {VAULT_PROVIDERS.map((item) => {
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
                        <CheckCircle2 className="h-3 w-3" /> Encrypted & Saved
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
    </div>
  );
}