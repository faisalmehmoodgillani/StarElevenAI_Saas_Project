"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Sparkles,
  KeyRound,
  Plug,
  Save,
  Copy,
  Check,
  Loader2,
  UserCheck,
  Shield,
  MessageSquare,
  Calendar,
  Globe,
  Server,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  IndustryConfigTab,
  type IndustryConfigData,
} from "@/components/settings/IndustryConfigTab";
import { ApiKeyVaultTab } from "@/components/settings/ApiKeyVaultTab";
import {
  IntegrationsWizardModal,
  type IntegrationToolDef,
} from "@/components/settings/IntegrationsWizardModal";

type SettingsTab = "workspace" | "industry" | "vault" | "integrations";

const INTEGRATION_TOOLS: (IntegrationToolDef & { icon: React.ElementType })[] = [
  {
    id: "whatsapp_crm",
    name: "WhatsApp Cloud CRM",
    category: "Messaging & Leads",
    icon: MessageSquare,
    description:
      "Connect Meta WhatsApp Business Cloud API so your AI agents can reply to client inquiries and qualify leads on WhatsApp 24/7.",
    stepsOverview: [
      "Open Meta for Developers > WhatsApp > API Setup.",
      "Copy your Permanent System User Access Token and Phone Number ID.",
      "Paste below to link WhatsApp directly to this client workspace.",
    ],
    fieldLabel: "WhatsApp Permanent Access Token",
    fieldPlaceholder: "EAABsbCS1iHgBO...",
    secondaryLabel: "Phone Number ID",
    secondaryPlaceholder: "109283746519283",
  },
  {
    id: "google_workspace",
    name: "Google Calendar & Gmail",
    category: "Scheduling & Email",
    icon: Calendar,
    description:
      "Allow your agents to check real-time calendar availability, book client meetings, and send follow-up emails automatically.",
    stepsOverview: [
      "Enable Google Calendar & Gmail API in Google Cloud Console.",
      "Paste your OAuth Client / Webhook Bridge URL below.",
      "Verify connection to unlock automated appointment booking.",
    ],
    fieldLabel: "Google MCP / OAuth Bridge Credential",
    fieldPlaceholder: "ya29.a0AfH6SMB...",
    secondaryLabel: "Default Booking Calendar Email",
    secondaryPlaceholder: "bookings@yourcompany.com",
  },
  {
    id: "tavily_search",
    name: "Tavily Live Web Search",
    category: "Market Intelligence",
    icon: Globe,
    description:
      "Equip your Deep Research Agent with real-time internet search for competitor analysis, live news, and market verification.",
    stepsOverview: [
      "Sign in at app.tavily.com and copy your API key.",
      "Paste your tvly-... key in the next step.",
      "Agents will automatically verify live facts during conversations.",
    ],
    fieldLabel: "Tavily API Key",
    fieldPlaceholder: "tvly-xxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    id: "custom_mcp",
    name: "Custom MCP Tool Server",
    category: "Model Context Protocol",
    icon: Server,
    description:
      "Plug in any external Model Context Protocol (MCP) SSE or HTTP server to expand your workspace agents with custom company APIs[cite: 1].",
    stepsOverview: [
      "Deploy or copy your MCP Server SSE endpoint URL.",
      "Provide an optional Bearer Auth header token.",
      "Click Verify to register dynamic MCP tools for Module 05 agents.",
    ],
    fieldLabel: "MCP Server Endpoint URL",
    fieldPlaceholder: "https://mcp.yourdomain.com/sse",
    secondaryLabel: "Authorization Bearer Token (Optional)",
    secondaryPlaceholder: "Bearer mcp_secret_...",
  },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function SettingsPage() {
  const { activeWorkspace, refreshWorkspaces, user, userEmail } = useWorkspace();

  const [activeTab, setActiveTab] = useState<SettingsTab>("workspace");

  // Workspace General Profile State
  const [companyName, setCompanyName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Integrations Wizard State
  const [wizardTool, setWizardTool] = useState<IntegrationToolDef | null>(null);
  const [verifiedTools, setVerifiedTools] = useState<Record<string, boolean>>({
    tavily_search: true,
  });

  useEffect(() => {
    if (activeWorkspace) {
      setCompanyName(activeWorkspace.name || "");
      setWorkspaceSlug(activeWorkspace.slug || "");
    }
  }, [activeWorkspace]);

  const workspaceId =
    activeWorkspace?.id || (activeWorkspace as any)?.workspace_id || "";

  const handleCopyWorkspaceId = () => {
    if (!workspaceId) return;
    navigator.clipboard.writeText(workspaceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !companyName.trim()) return;

    setSavingGeneral(true);
    setGeneralFeedback(null);

    try {
      const cleanSlug = workspaceSlug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: companyName.trim(),
            slug: cleanSlug || activeWorkspace?.slug,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update workspace.");
      }

      await refreshWorkspaces();
      setGeneralFeedback({
        type: "success",
        text: "Company workspace name & slug updated successfully!",
      });
    } catch (err: any) {
      setGeneralFeedback({
        type: "error",
        text: err?.message || "Could not update workspace settings.",
      });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handlePlanModeUpdate = async (newMode: "managed" | "byok") => {
    if (!workspaceId) return;
    await fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_mode: newMode }),
    });
    await refreshWorkspaces();
  };

  const TABS: {
    id: SettingsTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    {
      id: "workspace",
      label: "Workspace & Profile",
      icon: Building2,
    },
    {
      id: "industry",
      label: "Industry AI Brain",
      icon: Sparkles,
      badge: "Task 4",
    },
    {
      id: "vault",
      label: "Plan & API Vault",
      icon: KeyRound,
      badge: "AES-256",
    },
    {
      id: "integrations",
      label: "Tools & MCP Wizard",
      icon: Plug,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Enterprise Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#121215] via-[#141612] to-[#121215] p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#84CC16] shadow-[0_0_10px_#84CC16]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">
              Enterprise Tenant Control Center
            </span>
          </div>
          <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
            {activeWorkspace?.name || "Workspace"} — Settings & Vault
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Configure company identity, industry-specific AI behavior, AES-256
            encrypted API keys, and external MCP tool connectors[cite: 1].
          </p>
        </div>

        {/* Tenant ID Quick Copy Pill */}
        {workspaceId && (
          <button
            type="button"
            onClick={handleCopyWorkspaceId}
            className="flex items-center gap-2 self-start rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 font-mono text-xs text-zinc-300 transition hover:border-[#84CC16]/50 sm:self-center"
            title="Copy Tenant Workspace ID"
          >
            <span className="text-zinc-500">ID:</span>
            <span className="max-w-[130px] truncate text-zinc-200">
              {workspaceId}
            </span>
            {copiedId ? (
              <Check className="h-3.5 w-3.5 text-[#84CC16]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[#84CC16] text-[#09090B] shadow-lg shadow-[#84CC16]/15"
                  : "border border-zinc-800 bg-[#121215] text-zinc-300 hover:border-zinc-700 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    isActive
                      ? "bg-[#09090B]/20 text-[#09090B]"
                      : "bg-[#84CC16]/15 text-[#A3E635]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: WORKSPACE & OPERATOR PROFILE */}
      {activeTab === "workspace" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Company / Workspace Identity Form */}
          <form
            onSubmit={handleSaveGeneralSettings}
            className="space-y-4 rounded-2xl border border-zinc-800 bg-[#121215] p-6 lg:col-span-2"
          >
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white">
                Company & Tenant Identity
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Customize your agency or client company name (especially useful
                after Google OAuth sign-in)[cite: 2].
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Company / Agency Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. StarEleven Agency"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Workspace URL Slug
                </label>
                <input
                  type="text"
                  required
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  placeholder="stareleven-agency"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-sm text-[#A3E635] placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>
            </div>

            {generalFeedback && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  generalFeedback.type === "success"
                    ? "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635]"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {generalFeedback.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingGeneral}
                className="inline-flex items-center gap-2 rounded-xl bg-[#84CC16] px-5 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
              >
                {savingGeneral ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Company Workspace
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Operator Profile Summary Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#121215] p-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {user?.fullName || "Workspace Operator"}
                  </h3>
                  <p className="font-mono text-xs text-zinc-400">
                    {userEmail || user?.email || "operator@stareleven.ai"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 border-t border-zinc-800 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Access Role</span>
                  <span className="rounded bg-[#84CC16]/15 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-[#A3E635]">
                    {activeWorkspace?.role || "OWNER / ADMIN"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Active Plan Mode</span>
                  <span className="font-mono font-semibold uppercase text-zinc-200">
                    {activeWorkspace?.plan_mode || "MANAGED"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Data Isolation</span>
                  <span className="inline-flex items-center gap-1 text-zinc-200">
                    <Shield className="h-3.5 w-3.5 text-[#84CC16]" /> RLS
                    Enforced[cite: 1, 4]
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-800 bg-[#09090B] p-3 text-[11px] text-zinc-400">
              All threads, CRM leads, RAG vectors, and API keys are strictly
              scoped to <strong className="text-zinc-200">{companyName}</strong>[cite: 1].
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDUSTRY AI BRAIN (TASK 4) */}
      {activeTab === "industry" && (
        <IndustryConfigTab
          workspaceId={workspaceId}
          workspaceName={activeWorkspace?.name || "StarEleven Workspace"}
          initialIndustry={(activeWorkspace as any)?.industry || "general_b2b"}
          initialConfig={(activeWorkspace as any)?.industry_config}
          onSaved={() => {
            refreshWorkspaces();
          }}
        />
      )}

      {/* TAB 3: PLAN MODE & AES-256 API VAULT */}
      {activeTab === "vault" && (
        <ApiKeyVaultTab
          workspaceId={workspaceId}
          planMode={activeWorkspace?.plan_mode || "managed"}
          onPlanModeChange={handlePlanModeUpdate}
        />
      )}

      {/* TAB 4: NON-TECHNICAL TOOLS & MCP GUIDED WIZARD */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-white">
                  Guided Enterprise Integrations & MCP Connectors[cite: 1, 2]
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Connect external business tools using our 3-step non-technical
                  wizard—ready for Module 05 Specialized Agents[cite: 2].
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {INTEGRATION_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isConnected = !!verifiedTools[tool.id];

                return (
                  <div
                    key={tool.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#09090B] p-5 transition hover:border-zinc-700"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] text-[#A3E635]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                              {tool.category}
                            </span>
                            <h3 className="text-sm font-bold text-white">
                              {tool.name}
                            </h3>
                          </div>
                        </div>

                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                            <CheckCircle2 className="h-3 w-3" /> ✓ Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
                            Not Connected
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                        {tool.description}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-3.5">
                      <span className="font-mono text-[11px] text-zinc-500">
                        3-Step Guided Wizard
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardTool(tool)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 px-3.5 py-1.5 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B]"
                      >
                        {isConnected ? "Reconfigure" : "Launch Wizard"}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Guided "Next-Next" Popup Modal */}
      <IntegrationsWizardModal
        tool={wizardTool}
        onClose={() => setWizardTool(null)}
        onVerified={(toolId) => {
          setVerifiedTools((prev) => ({ ...prev, [toolId]: true }));
        }}
      />
    </div>
  );
}