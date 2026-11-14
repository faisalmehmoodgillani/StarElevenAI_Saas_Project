"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Sparkles,
  KeyRound,
  Plug,
  Users,
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
  Lock,
  UserPlus,
  Mail,
  Clock,
  Trash2,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { IndustryConfigTab } from "@/components/settings/IndustryConfigTab";
import { ApiKeyVaultTab } from "@/components/settings/ApiKeyVaultTab";
import {
  IntegrationsWizardModal,
  type IntegrationToolDef,
} from "@/components/settings/IntegrationsWizardModal";

type SettingsTab =
  | "workspace"
  | "industry"
  | "vault"
  | "integrations"
  | "team";

type ManagedRequestState = "none" | "pending" | "approved";

interface TeamMemberItem {
  email: string;
  full_name?: string | null;
  role: string;
  status: string;
  is_owner?: boolean;
  created_at?: string | null;
}

const TAB_STORAGE_KEY = "stareleven_settings_active_tab";
const MANAGED_REQ_STORAGE_PREFIX = "stareleven_managed_request_";

const INTEGRATION_TOOLS: (IntegrationToolDef & {
  icon: React.ElementType;
  freeFallback?: string;
})[] = [
  {
    id: "tavily_search",
    name: "Tavily Live Web Search",
    category: "Web Research & Fact-Checking",
    icon: Globe,
    freeFallback: "DuckDuckGo Free Search Active",
    description:
      "Connect your Tavily API key for deep enterprise web research. If left unconfigured, agents automatically use DuckDuckGo Free Search at $0 cost.",
    stepsOverview: [
      "Sign in at app.tavily.com and copy your API key.",
      "Paste your tvly-... key in the next step.",
      "Click Verify to upgrade web research from free mode to Tavily.",
    ],
    fieldLabel: "Tavily API Key",
    fieldPlaceholder: "tvly-xxxxxxxxxxxxxxxxxxxxxxxx",
  },
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
      "Paste below to link WhatsApp directly to this workspace.",
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
      "Paste your OAuth Client or Webhook Bridge credential below.",
      "Verify connection to unlock automated appointment booking.",
    ],
    fieldLabel: "Google OAuth / Bridge Credential",
    fieldPlaceholder: "ya29.a0AfH6SMB...",
    secondaryLabel: "Default Booking Calendar Email",
    secondaryPlaceholder: "bookings@yourcompany.com",
  },
  {
    id: "custom_mcp",
    name: "Custom MCP Tool Server",
    category: "Model Context Protocol",
    icon: Server,
    description:
      "Plug in any external Model Context Protocol (MCP) SSE or HTTP server to connect your workspace agents with custom internal APIs.",
    stepsOverview: [
      "Copy your MCP Server SSE endpoint URL.",
      "Provide an optional Bearer Auth header token.",
      "Click Verify to register dynamic MCP tools for your agents.",
    ],
    fieldLabel: "MCP Server Endpoint URL",
    fieldPlaceholder: "https://mcp.yourdomain.com/sse",
    secondaryLabel: "Authorization Bearer Token (Optional)",
    secondaryPlaceholder: "Bearer mcp_secret_...",
  },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function slugifyCompanyName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SettingsPage() {
  const { activeWorkspace, refreshWorkspaces, user, userEmail } = useWorkspace();

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window !== "undefined") {
      const saved = window.sessionStorage.getItem(
        TAB_STORAGE_KEY
      ) as SettingsTab | null;
      if (
        saved &&
        ["workspace", "industry", "vault", "integrations", "team"].includes(
          saved
        )
      ) {
        return saved;
      }
    }
    return "workspace";
  });

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(TAB_STORAGE_KEY, tab);
    }
    if (tab === "vault" || tab === "workspace") {
      void refreshWorkspaces();
    }
  };

  // Workspace & Profile State
  const [companyName, setCompanyName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [manualSlugOverride, setManualSlugOverride] = useState(false);
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Managed Plan Approval & Request Access Sync State
  const [localPendingRequest, setLocalPendingRequest] = useState(false);

  // Integrations Wizard State
  const [wizardTool, setWizardTool] = useState<IntegrationToolDef | null>(null);
  const [verifiedTools, setVerifiedTools] = useState<Record<string, boolean>>(
    {}
  );

  // Team Invite & Members State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  const workspaceId =
    activeWorkspace?.id || activeWorkspace?.workspace_id || "";

  const currentRole = (activeWorkspace?.role || "owner").toLowerCase();
  const canManageWorkspace =
    currentRole === "owner" || currentRole === "admin";

  const rawPlanMode = (activeWorkspace?.plan_mode || "byok").toLowerCase();
  const backendManagedApproved = Boolean(activeWorkspace?.managed_approved);
  const backendRequestStatus = (
    activeWorkspace?.managed_request_status || "none"
  ).toLowerCase();

  const effectiveManagedApproved =
    rawPlanMode === "managed" ||
    backendManagedApproved ||
    backendRequestStatus === "approved";

  const effectivePlanMode: "managed" | "byok" = effectiveManagedApproved
    ? "managed"
    : "byok";

  const effectiveManagedRequestStatus: ManagedRequestState =
    effectiveManagedApproved
      ? "approved"
      : backendRequestStatus === "pending" || localPendingRequest
      ? "pending"
      : "none";

  const loadTeamMembers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/members`
      );
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch {
      // ignore silent network retry
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!activeWorkspace) return;

    setCompanyName(activeWorkspace.name || "");
    setWorkspaceSlug(activeWorkspace.slug || "");
    setManualSlugOverride(false);

    if (typeof window !== "undefined" && workspaceId) {
      const storageKey = `${MANAGED_REQ_STORAGE_PREFIX}${workspaceId}`;
      if (effectiveManagedApproved || backendRequestStatus === "rejected") {
        window.localStorage.removeItem(storageKey);
        setLocalPendingRequest(false);
      } else if (backendRequestStatus === "pending") {
        window.localStorage.setItem(storageKey, "pending");
        setLocalPendingRequest(true);
      } else {
        const stored = window.localStorage.getItem(storageKey);
        setLocalPendingRequest(stored === "pending");
      }
    }

    void loadTeamMembers();
  }, [
    activeWorkspace,
    workspaceId,
    effectiveManagedApproved,
    backendRequestStatus,
    loadTeamMembers,
  ]);

  const handleVaultPlanStateUpdated = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      workspaceId &&
      !effectiveManagedApproved
    ) {
      window.localStorage.setItem(
        `${MANAGED_REQ_STORAGE_PREFIX}${workspaceId}`,
        "pending"
      );
      setLocalPendingRequest(true);
    }
    await refreshWorkspaces();
  }, [workspaceId, effectiveManagedApproved, refreshWorkspaces]);

  const handleCompanyNameChange = (newName: string) => {
    setCompanyName(newName);
    if (!manualSlugOverride) {
      const generated = slugifyCompanyName(newName);
      if (generated) {
        setWorkspaceSlug(generated);
      }
    }
  };

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
      const finalSlug =
        slugifyCompanyName(workspaceSlug) ||
        slugifyCompanyName(companyName) ||
        activeWorkspace?.slug;

      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: companyName.trim(),
            slug: finalSlug,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update workspace.");
      }

      setWorkspaceSlug(finalSlug || "");
      await refreshWorkspaces();
      setGeneralFeedback({
        type: "success",
        text: "Company workspace name & slug updated successfully!",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not update workspace settings.";
      setGeneralFeedback({
        type: "error",
        text: message,
      });
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !workspaceId) return;

    setSendingInvite(true);
    setInviteFeedback(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            role: inviteRole,
            invited_by: userEmail || user?.email || "Workspace Owner",
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Failed to send workspace invitation.");
      }

      setInviteFeedback({
        type: data.email_sent ? "success" : "warning",
        text:
          data.message ||
          `Invitation sent to ${inviteEmail.trim()} as ${inviteRole.toUpperCase()}.`,
      });
      setInviteEmail("");
      await loadTeamMembers();
    } catch (err: unknown) {
      setInviteFeedback({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Could not send invitation email.",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemoveMember = async (memberEmail: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/members/${encodeURIComponent(
          memberEmail
        )}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setInviteFeedback({
          type: "error",
          text: errData.detail || "Cannot remove this member.",
        });
        return;
      }
      await loadTeamMembers();
    } catch {
      // ignore
    }
  };

  // RBAC Guard: Operators & Viewers cannot access Workspace Settings, Vault, or Team Admin
  if (activeWorkspace && !canManageWorkspace) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-300">
          <Lock className="h-6 w-6" />
        </div>
        <span className="mt-4 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-[11px] font-bold uppercase text-zinc-400">
          Role: {currentRole.toUpperCase()}
        </span>
        <h1 className="mt-3 text-xl font-bold text-white">
          Workspace Control Center Restricted
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          API Vault keys, Industry AI Brain, and Team Access settings are
          managed exclusively by the Workspace Owner of{" "}
          <strong className="text-zinc-200">{activeWorkspace.name}</strong>. You
          already have full access to run AI agents with the workspace&apos;s
          pre-configured engine.
        </p>
        <Link
          href="/chat"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#84CC16] px-5 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635]"
        >
          Return to AI Command Center
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

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
    },
    {
      id: "vault",
      label: "Plan & AI Vault",
      icon: KeyRound,
      badge: "AES-256",
    },
    {
      id: "integrations",
      label: "Tools & MCP",
      icon: Plug,
    },
    {
      id: "team",
      label: "Team & Access",
      icon: Users,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Header Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#121215] via-[#141612] to-[#121215] p-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#84CC16] shadow-[0_0_10px_#84CC16]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">
              Workspace Control Center
            </span>
          </div>
          <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
            {activeWorkspace?.name || "Workspace"} — Settings &amp; Vault
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Manage company identity, industry AI persona, encrypted LLM keys,
            external tool integrations, and team access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {(!process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ||
            (userEmail || user?.email || "").toLowerCase() ===
              process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL.toLowerCase()) && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 px-3.5 py-2 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B]"
            >
              <Shield className="h-3.5 w-3.5" />
              Admin Approvals
            </Link>
          )}

          {workspaceId && (
            <button
              type="button"
              onClick={handleCopyWorkspaceId}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 font-mono text-xs text-zinc-300 transition hover:border-[#84CC16]/50"
              title="Copy Workspace ID"
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
              onClick={() => handleTabChange(tab.id)}
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

      {/* TAB 1: WORKSPACE & PROFILE */}
      {activeTab === "workspace" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleSaveGeneralSettings}
            className="space-y-4 rounded-2xl border border-zinc-800 bg-[#121215] p-6 lg:col-span-2"
          >
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white">
                Company &amp; Workspace Identity
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Updating your company name automatically keeps your workspace
                URL slug synchronized.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Company / Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="e.g. StarEleven Agency"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Workspace URL Slug
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !manualSlugOverride;
                      setManualSlugOverride(next);
                      if (!next) {
                        setWorkspaceSlug(slugifyCompanyName(companyName));
                      }
                    }}
                    className="font-mono text-[10px] text-[#A3E635] hover:underline"
                  >
                    {manualSlugOverride ? "Auto-sync slug" : "Auto-synced"}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={workspaceSlug}
                  onChange={(e) => {
                    setManualSlugOverride(true);
                    setWorkspaceSlug(slugifyCompanyName(e.target.value));
                  }}
                  placeholder="stareleven-agency"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-sm text-[#A3E635] placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Business Timezone (For AI Scheduling)
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-100 focus:border-[#84CC16] focus:outline-none"
                >
                  <option value="Asia/Karachi">
                    Asia/Karachi (PKT, UTC+5)
                  </option>
                  <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
                  <option value="Europe/London">
                    Europe/London (GMT/BST)
                  </option>
                  <option value="America/New_York">
                    America/New_York (EST/EDT)
                  </option>
                  <option value="America/Los_Angeles">
                    America/Los_Angeles (PST/PDT)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  disabled
                  value={userEmail || user?.email || ""}
                  className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-zinc-800/80 bg-[#09090B]/60 px-3.5 py-2.5 font-mono text-xs text-zinc-400"
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
                    Save Workspace Profile
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Operator Account & Security Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#121215] p-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-white">
                    {user?.fullName || "Workspace Operator"}
                  </h3>
                  <p className="truncate font-mono text-xs text-zinc-400">
                    {userEmail || user?.email || "operator@stareleven.ai"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 border-t border-zinc-800 pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Access Role</span>
                  <span className="rounded bg-[#84CC16]/15 px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-[#A3E635]">
                    {currentRole.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Active Plan</span>
                  <span className="font-mono font-semibold uppercase text-zinc-200">
                    {effectivePlanMode.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Data Isolation</span>
                  <span className="inline-flex items-center gap-1 text-zinc-200">
                    <Shield className="h-3.5 w-3.5 text-[#84CC16]" /> Tenant
                    Isolated
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/change-password"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-white"
              >
                <Lock className="h-3.5 w-3.5 text-[#84CC16]" />
                Update Account Password
              </Link>
              <p className="text-center text-[11px] text-zinc-500">
                All chats, leads, and keys are scoped strictly to{" "}
                <span className="text-zinc-300">{companyName}</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDUSTRY AI BRAIN */}
      {activeTab === "industry" && (
        <IndustryConfigTab
          workspaceId={workspaceId}
          workspaceName={activeWorkspace?.name || "Workspace"}
          initialIndustry={activeWorkspace?.industry || "general_b2b"}
          initialConfig={activeWorkspace?.industry_config}
          onSaved={() => {
            void refreshWorkspaces();
          }}
        />
      )}

      {/* TAB 3: PLAN & AI VAULT */}
      {activeTab === "vault" && (
        <div className="space-y-4">
          {effectiveManagedRequestStatus === "pending" &&
            !effectiveManagedApproved && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-bold text-amber-300">
                      Request Access Sent — Pending SuperAdmin Approval
                    </p>
                    <p className="mt-0.5 text-[11px] text-amber-200/80">
                      Your Full Manage upgrade request has been submitted. Once
                      approved by the platform administrator, Full Manage mode
                      will activate automatically.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-amber-300">
                  Request Access
                </span>
              </div>
            )}

          {effectiveManagedApproved && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#84CC16]/40 bg-[#84CC16]/10 px-4 py-3 text-xs text-[#A3E635]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#84CC16]" />
                <div>
                  <p className="font-bold text-[#A3E635]">
                    Full Manage Plan Active
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-300">
                    SuperAdmin approval verified. Platform-managed AI engines
                    are active for this workspace.
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/20 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-[#A3E635]">
                Active
              </span>
            </div>
          )}

          <ApiKeyVaultTab
            workspaceId={workspaceId}
            userEmail={userEmail || user?.email || ""}
            planMode={effectivePlanMode}
            managedApproved={effectiveManagedApproved}
            managedRequestStatus={effectiveManagedRequestStatus}
            onPlanStateUpdated={handleVaultPlanStateUpdated}
          />
        </div>
      )}

      {/* TAB 4: TOOLS & MCP */}
      {activeTab === "integrations" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6">
            <div>
              <h2 className="text-base font-bold text-white">
                External Tools &amp; MCP Connectors
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Connect web search, messaging channels, calendars, and custom
                MCP servers for your workspace agents.
              </p>
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] text-[#A3E635]">
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
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </span>
                        ) : tool.freeFallback ? (
                          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                            {tool.freeFallback}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
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
                        3-Step Guided Setup
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardTool(tool)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 px-3.5 py-1.5 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B]"
                      >
                        {isConnected ? "Reconfigure" : "Configure"}
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

      {/* TAB 5: TEAM & ACCESS */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-zinc-800 bg-[#121215] p-6 lg:col-span-2">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white">
                Workspace Members &amp; Client Access
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Invite team operators or client stakeholders to collaborate
                inside <strong className="text-zinc-200">{companyName}</strong>.
              </p>
            </div>

            <form
              onSubmit={handleInviteSubmit}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-200 focus:border-[#84CC16] focus:outline-none"
              >
                <option value="admin">Admin (Full Access)</option>
                <option value="operator">Operator (Chat &amp; CRM)</option>
                <option value="viewer">Viewer (Read Only)</option>
              </select>

              <button
                type="submit"
                disabled={sendingInvite}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Send Invite
                  </>
                )}
              </button>
            </form>

            {inviteFeedback && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                  inviteFeedback.type === "success"
                    ? "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635]"
                    : inviteFeedback.type === "warning"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {inviteFeedback.text}
              </div>
            )}

            {/* Single Clean Members List (Owner Protected) */}
            <div className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-[#09090B]">
              {teamMembers.map((member) => {
                const isWorkspaceOwner =
                  Boolean(member.is_owner) ||
                  member.role.toLowerCase() === "owner";

                return (
                  <div
                    key={member.email}
                    className="flex items-center justify-between px-4 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                          isWorkspaceOwner
                            ? "bg-[#84CC16]/15 text-[#A3E635]"
                            : "bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        {(member.full_name || member.email)
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {member.full_name || member.email}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-400">
                          {member.email}{" "}
                          {!isWorkspaceOwner && (
                            <span className="capitalize text-zinc-500">
                              &bull; {member.status}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          isWorkspaceOwner
                            ? "border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]"
                            : "border border-zinc-700 bg-zinc-900 text-zinc-300"
                        }`}
                      >
                        {isWorkspaceOwner ? "OWNER" : member.role.toUpperCase()}
                      </span>

                      {!isWorkspaceOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.email)}
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                          title="Remove member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-zinc-800 bg-[#121215] p-6">
            <h3 className="text-sm font-bold text-white">Role Permissions</h3>
            <div className="space-y-2.5 text-xs text-zinc-400">
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <p className="font-bold text-[#A3E635]">Owner / Admin</p>
                <p className="mt-0.5 text-[11px]">
                  Full access to API Vault, Industry AI Brain, Agents, and Team
                  invites.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <p className="font-bold text-zinc-200">Operator</p>
                <p className="mt-0.5 text-[11px]">
                  Can run AI Command Center chats, manage CRM leads, and upload
                  knowledge docs.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <p className="font-bold text-zinc-300">Viewer</p>
                <p className="mt-0.5 text-[11px]">
                  Read-only access to conversations, reports, and analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guided Setup Modal */}
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