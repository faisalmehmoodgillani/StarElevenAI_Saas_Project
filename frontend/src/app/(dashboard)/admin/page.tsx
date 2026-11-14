"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  Cpu,
  Filter,
  Layers,
  Loader2,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface IndustryDistItem {
  industry: string;
  label: string;
  count: number;
  percentage: number;
}

interface AdminOverviewData {
  total_users: number;
  owners_count: number;
  operators_count: number;
  total_workspaces: number;
  active_workspaces: number;
  suspended_workspaces: number;
  workspaces_by_plan_mode: {
    byok: number;
    managed: number;
  };
  workspaces_by_plan_tier: Record<string, number>;
  workspaces_by_request_status: Record<string, number>;
  total_configured_agents: number;
  total_conversations: number;
  total_tokens_consumed: number;
  total_monthly_token_quota: number;
  industry_distribution: IndustryDistItem[];
}

interface ConfiguredAgentItem {
  id: string;
  agent_type: string;
  provider: string;
  model_name: string;
  has_custom_key: boolean;
  is_active: boolean;
}

interface AdminWorkspaceItem {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  member_role: "owner" | "operator" | string;
  industry: string;
  plan_tier: string;
  plan_mode: "byok" | "managed" | string;
  requested_plan_tier?: string | null;
  billing_interval: string;
  managed_request_status: string;
  managed_approved: boolean;
  tokens_used_this_month: number;
  monthly_token_limit: number;
  usage_percent: number;
  billing_cycle_end?: string | null;
  is_active: boolean;
  configured_agents: ConfiguredAgentItem[];
  created_at?: string | null;
}

interface AdminUserRecord {
  user_id: string;
  email: string;
  full_name: string;
  primary_role: "owner" | "operator" | string;
  signup_method: string;
  created_at?: string | null;
  total_workspaces: number;
  owned_workspaces_count: number;
  joined_workspaces_count: number;
  workspaces: AdminWorkspaceItem[];
}

interface PendingManagedRequest {
  workspace_id: string;
  workspace_name: string;
  slug: string;
  industry: string;
  owner_email: string;
  owner_name: string;
  requested_plan_tier: string;
  billing_interval: string;
  current_monthly_token_limit: number;
  default_monthly_token_limit: number;
  created_at?: string | null;
}

function isSuperAdminAuthorized(email?: string | null): boolean {
  const configured = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "";
  if (!configured.trim() || !email || !email.trim()) return false;
  const allowedList = configured
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowedList.includes(email.trim().toLowerCase());
}

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatPlanTierLabel(tier?: string | null): string {
  if (!tier) return "BYOK Free";
  const map: Record<string, string> = {
    byok_free: "BYOK Free",
    managed_starter: "Managed Starter",
    managed_growth: "Managed Growth",
    managed_enterprise: "Managed Agency",
  };
  return map[tier.toLowerCase()] || tier.replace(/_/g, " ").toUpperCase();
}

function formatIndustryLabel(industry?: string | null): string {
  if (!industry) return "Agency";
  const map: Record<string, string> = {
    agency: "Agency",
    real_estate: "Real Estate",
    ecommerce: "E-Commerce",
    healthcare: "Healthcare",
    education: "Education",
    saas: "SaaS",
    other: "Other",
  };
  return map[industry.toLowerCase()] || industry.replace(/_/g, " ");
}

export default function SuperAdminCommandCenterPage() {
  const router = useRouter();
  const { user, userEmail, isLoading: isAuthLoading } = useWorkspace();

  const resolvedEmail = (userEmail || user?.email || "").trim().toLowerCase();
  const isAuthorized = useMemo(
    () => isSuperAdminAuthorized(resolvedEmail),
    [resolvedEmail]
  );

  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [usersDirectory, setUsersDirectory] = useState<AdminUserRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    PendingManagedRequest[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Editable quota inputs keyed by workspace_id
  const [approvalQuotas, setApprovalQuotas] = useState<Record<string, number>>(
    {}
  );
  const [directoryQuotas, setDirectoryQuotas] = useState<
    Record<string, number>
  >({});
  const [busyWorkspaceId, setBusyWorkspaceId] = useState<string | null>(null);

  // Directory filters & expandable rows
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [planModeFilter, setPlanModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>(
    {}
  );

  // Redirect unauthorized users immediately
  useEffect(() => {
    if (!isAuthLoading && !isAuthorized) {
      router.replace("/chat");
    }
  }, [isAuthLoading, isAuthorized, router]);

  const loadAdminTelemetry = useCallback(async () => {
    if (!isAuthorized || !resolvedEmail) return;

    setIsLoadingData(true);
    setErrorBanner(null);

    try {
      const headers = {
        "Content-Type": "application/json",
        "X-User-Email": resolvedEmail,
      };

      const [overviewRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/overview`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/users`, { headers }),
      ]);

      if (!overviewRes.ok) {
        const err = await overviewRes.json().catch(() => ({}));
        throw new Error(
          err.detail || `Failed to load platform overview (${overviewRes.status})`
        );
      }

      if (!usersRes.ok) {
        const err = await usersRes.json().catch(() => ({}));
        throw new Error(
          err.detail || `Failed to load user directory (${usersRes.status})`
        );
      }

      const overviewData: AdminOverviewData = await overviewRes.json();
      const usersData = await usersRes.json();

      const fetchedUsers: AdminUserRecord[] = Array.isArray(usersData.users)
        ? usersData.users
        : [];
      const fetchedPending: PendingManagedRequest[] = Array.isArray(
        usersData.pending_managed_requests
      )
        ? usersData.pending_managed_requests
        : [];

      setOverview(overviewData);
      setUsersDirectory(fetchedUsers);
      setPendingRequests(fetchedPending);

      // Initialize quota editors
      setApprovalQuotas((prev) => {
        const next = { ...prev };
        for (const req of fetchedPending) {
          if (next[req.workspace_id] === undefined) {
            next[req.workspace_id] = req.default_monthly_token_limit;
          }
        }
        return next;
      });

      setDirectoryQuotas((prev) => {
        const next = { ...prev };
        for (const u of fetchedUsers) {
          for (const ws of u.workspaces) {
            if (next[ws.id] === undefined) {
              next[ws.id] = ws.monthly_token_limit;
            }
          }
        }
        return next;
      });
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : "Unable to load Super Admin telemetry."
      );
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthorized, resolvedEmail]);

  useEffect(() => {
    if (!isAuthLoading && isAuthorized) {
      loadAdminTelemetry();
    }
  }, [isAuthLoading, isAuthorized, loadAdminTelemetry]);

  const handleWorkspaceDecision = async (
    workspaceId: string,
    payload: {
      action:
        | "approve_managed"
        | "reject_managed"
        | "update_quota"
        | "suspend"
        | "reactivate";
      plan_tier?: string;
      monthly_token_limit?: number;
    },
    successMessage: string
  ) => {
    if (!resolvedEmail) return;
    setBusyWorkspaceId(workspaceId);
    setErrorBanner(null);
    setStatusBanner(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/workspaces/${encodeURIComponent(
          workspaceId
        )}/decision`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-User-Email": resolvedEmail,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.detail || `Administrative decision failed (${response.status})`
        );
      }

      setStatusBanner(successMessage);
      await loadAdminTelemetry();
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to update workspace."
      );
    } finally {
      setBusyWorkspaceId(null);
    }
  };

  const toggleExpandUser = (email: string) => {
    setExpandedEmails((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  // Filtered user & workspace directory
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const hasWorkspaceFilter =
      industryFilter !== "all" ||
      planModeFilter !== "all" ||
      statusFilter !== "all";

    return usersDirectory
      .map((u) => {
        const matchingWorkspaces = u.workspaces.filter((ws) => {
          const matchesIndustry =
            industryFilter === "all" ||
            ws.industry.toLowerCase() === industryFilter;
          const matchesPlanMode =
            planModeFilter === "all" ||
            ws.plan_mode.toLowerCase() === planModeFilter;
          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" && ws.is_active) ||
            (statusFilter === "suspended" && !ws.is_active) ||
            (statusFilter === "pending" &&
              ws.managed_request_status === "pending");

          return matchesIndustry && matchesPlanMode && matchesStatus;
        });

        const matchesUserText =
          !query ||
          u.email.toLowerCase().includes(query) ||
          u.full_name.toLowerCase().includes(query) ||
          u.user_id.toLowerCase().includes(query);

        const matchesWorkspaceText =
          !query ||
          matchingWorkspaces.some(
            (ws) =>
              ws.name.toLowerCase().includes(query) ||
              ws.slug.toLowerCase().includes(query) ||
              ws.id.toLowerCase().includes(query)
          );

        if (!matchesUserText && !matchesWorkspaceText) {
          return null;
        }

        if (hasWorkspaceFilter && matchingWorkspaces.length === 0) {
          return null;
        }

        return {
          ...u,
          workspaces: hasWorkspaceFilter ? matchingWorkspaces : u.workspaces,
        };
      })
      .filter((item): item is AdminUserRecord => item !== null);
  }, [
    usersDirectory,
    searchQuery,
    industryFilter,
    planModeFilter,
    statusFilter,
  ]);

  // Auth loading or unauthorized route guard screen
  if (isAuthLoading || !isAuthorized) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center bg-[#09090B] px-6 text-center text-zinc-200">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-white">
          {isAuthLoading
            ? "Verifying Super Admin Clearance..."
            : "Restricted Platform Zone"}
        </h2>
        <p className="mt-1 max-w-md text-xs text-zinc-400">
          {isAuthLoading
            ? "Checking root platform authorization credentials."
            : "This command center is strictly restricted to StarEleven AI Super Administrators. Redirecting to workspace..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] px-4 py-6 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Executive Header */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#121215] via-[#151812] to-[#121215] p-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#84CC16] shadow-[0_0_12px_#84CC16]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#A3E635]">
                Root Governance • Module 08
              </span>
            </div>
            <h1 className="mt-1.5 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-white">
              <ShieldCheck className="h-6 w-6 text-[#84CC16]" />
              Super Admin Platform Command Center
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Platform-wide telemetry, Managed Plan approval queue, token quota
              governance, and multi-tenant directory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
            <div className="rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 text-xs">
              <span className="text-zinc-500">Cleared Root: </span>
              <span className="font-mono font-semibold text-[#A3E635]">
                {resolvedEmail}
              </span>
            </div>

            <button
              type="button"
              onClick={loadAdminTelemetry}
              disabled={isLoadingData}
              className="inline-flex items-center gap-2 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 px-4 py-2 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin" : ""}`}
              />
              Refresh Telemetry
            </button>
          </div>
        </div>

        {/* Status & Error Alerts */}
        {statusBanner && (
          <div className="flex items-center justify-between rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/10 px-4 py-3 text-xs text-[#A3E635]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#84CC16]" />
              <span>{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-zinc-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {errorBanner && (
          <div className="flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-200 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* A. Platform KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Total Users
              </span>
              <div className="rounded-lg bg-[#84CC16]/15 p-2 text-[#84CC16]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {isLoadingData ? "—" : overview?.total_users ?? 0}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              {overview?.owners_count ?? 0} Owners •{" "}
              {overview?.operators_count ?? 0} Operators
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Total Workspaces
              </span>
              <div className="rounded-lg bg-[#84CC16]/15 p-2 text-[#84CC16]">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {isLoadingData ? "—" : overview?.total_workspaces ?? 0}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              {overview?.workspaces_by_plan_mode?.managed ?? 0} Managed •{" "}
              {overview?.workspaces_by_plan_mode?.byok ?? 0} BYOK
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Total Agents
              </span>
              <div className="rounded-lg bg-[#84CC16]/15 p-2 text-[#84CC16]">
                <Bot className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {isLoadingData ? "—" : overview?.total_configured_agents ?? 0}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              Configured AI Agents
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Total Conversations
              </span>
              <div className="rounded-lg bg-[#84CC16]/15 p-2 text-[#84CC16]">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">
              {isLoadingData ? "—" : overview?.total_conversations ?? 0}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              Persisted LangGraph Threads
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                Total Tokens Used
              </span>
              <div className="rounded-lg bg-[#84CC16]/15 p-2 text-[#84CC16]">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <p
              className="mt-3 text-2xl font-extrabold text-[#A3E635]"
              title={(overview?.total_tokens_consumed ?? 0).toLocaleString()}
            >
              {isLoadingData
                ? "—"
                : formatCompactNumber(overview?.total_tokens_consumed ?? 0)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">
              Pool:{" "}
              {formatCompactNumber(overview?.total_monthly_token_quota ?? 0)}{" "}
              tokens/mo
            </p>
          </div>
        </div>

        {/* B. Industry Distribution */}
        <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#84CC16]" />
              <h2 className="text-sm font-bold text-white">
                Workspace Industry Distribution
              </h2>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">
              {overview?.active_workspaces ?? 0} Active •{" "}
              {overview?.suspended_workspaces ?? 0} Suspended
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {overview?.industry_distribution &&
            overview.industry_distribution.length > 0 ? (
              overview.industry_distribution.map((item) => {
                const isSelected = industryFilter === item.industry;
                return (
                  <button
                    key={item.industry}
                    type="button"
                    onClick={() =>
                      setIndustryFilter(isSelected ? "all" : item.industry)
                    }
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? "border-[#84CC16] bg-[#84CC16]/20 text-[#A3E635]"
                        : "border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-bold text-[#A3E635]">
                      {item.count}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      ({item.percentage}%)
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500">
                No workspace industry records available yet.
              </p>
            )}
          </div>
        </div>

        {/* C. Managed Plan Approval Queue */}
        <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#84CC16]/15 text-[#84CC16]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Managed Plan Approval Queue
                </h2>
                <p className="text-xs text-zinc-400">
                  Review per-workspace Managed Plan upgrade requests, customize
                  monthly token pools, and activate 30-day billing cycles.
                </p>
              </div>
            </div>

            <span
              className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${
                pendingRequests.length > 0
                  ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                  : "border border-zinc-800 bg-[#09090B] text-zinc-400"
              }`}
            >
              {pendingRequests.length} Pending Request
              {pendingRequests.length === 1 ? "" : "s"}
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-[#09090B]/60 py-8 text-center">
              <CheckCircle2 className="h-7 w-7 text-[#84CC16]" />
              <p className="mt-2 text-sm font-semibold text-zinc-200">
                No Pending Managed Plan Requests
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                All workspace billing upgrade requests have been processed.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {pendingRequests.map((req) => {
                const isBusy = busyWorkspaceId === req.workspace_id;
                const quotaValue =
                  approvalQuotas[req.workspace_id] ??
                  req.default_monthly_token_limit;

                return (
                  <div
                    key={req.workspace_id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-amber-500/30 bg-[#09090B] p-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {req.workspace_name}
                          </h3>
                          <p className="font-mono text-[11px] text-zinc-500">
                            /{req.slug} • ID: {req.workspace_id.slice(0, 8)}...
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md border border-[#84CC16]/35 bg-[#84CC16]/15 px-2 py-0.5 font-mono text-[11px] font-bold text-[#A3E635]">
                            {formatPlanTierLabel(req.requested_plan_tier)}
                          </span>
                          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
                            {req.billing_interval}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        <span>
                          Owner:{" "}
                          <strong className="text-zinc-200">
                            {req.owner_name}
                          </strong>{" "}
                          ({req.owner_email})
                        </span>
                        <span className="rounded-full border border-zinc-800 bg-[#121215] px-2.5 py-0.5 text-[11px] text-zinc-300">
                          {formatIndustryLabel(req.industry)}
                        </span>
                      </div>

                      <div className="pt-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          Monthly Token Quota
                        </label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            min={10000}
                            step={100000}
                            value={quotaValue}
                            onChange={(e) =>
                              setApprovalQuotas((prev) => ({
                                ...prev,
                                [req.workspace_id]: Math.max(
                                  0,
                                  Number(e.target.value) || 0
                                ),
                              }))
                            }
                            className="w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-1.5 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                          />
                          <span className="shrink-0 font-mono text-[11px] text-zinc-500">
                            ({formatCompactNumber(quotaValue)})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-zinc-800/80 pt-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleWorkspaceDecision(
                            req.workspace_id,
                            { action: "reject_managed" },
                            `Rejected Managed Plan request for ${req.workspace_name}.`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleWorkspaceDecision(
                            req.workspace_id,
                            {
                              action: "approve_managed",
                              plan_tier: req.requested_plan_tier,
                              monthly_token_limit: quotaValue,
                            },
                            `Approved ${formatPlanTierLabel(
                              req.requested_plan_tier
                            )} for ${req.workspace_name} (${quotaValue.toLocaleString()} tokens/mo).`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-extrabold text-[#09090B] shadow-lg shadow-[#84CC16]/20 transition hover:bg-[#A3E635] disabled:opacity-50"
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Approve &amp; Activate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* D. User & Workspace Directory */}
        <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-base font-bold text-white">
                User &amp; Workspace Directory
              </h2>
              <p className="text-xs text-zinc-400">
                Inspect registered users, owned/joined workspaces, token
                consumption bars, configured agents, and workspace status.
              </p>
            </div>

            {/* Search & Multi-Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, email, workspace..."
                  className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-[#84CC16]"
                />
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#09090B] px-2.5 py-1.5">
                <Filter className="h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="bg-transparent text-xs text-zinc-300 outline-none"
                  aria-label="Filter by Industry"
                >
                  <option value="all" className="bg-[#121215]">
                    All Industries
                  </option>
                  <option value="agency" className="bg-[#121215]">
                    Agency
                  </option>
                  <option value="real_estate" className="bg-[#121215]">
                    Real Estate
                  </option>
                  <option value="ecommerce" className="bg-[#121215]">
                    E-Commerce
                  </option>
                  <option value="healthcare" className="bg-[#121215]">
                    Healthcare
                  </option>
                  <option value="education" className="bg-[#121215]">
                    Education
                  </option>
                  <option value="saas" className="bg-[#121215]">
                    SaaS
                  </option>
                  <option value="other" className="bg-[#121215]">
                    Other
                  </option>
                </select>
              </div>

              <select
                value={planModeFilter}
                onChange={(e) => setPlanModeFilter(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-300 outline-none focus:border-[#84CC16]"
                aria-label="Filter by Plan Mode"
              >
                <option value="all" className="bg-[#121215]">
                  All Plan Modes
                </option>
                <option value="managed" className="bg-[#121215]">
                  Managed Plan
                </option>
                <option value="byok" className="bg-[#121215]">
                  BYOK Mode
                </option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-300 outline-none focus:border-[#84CC16]"
                aria-label="Filter by Workspace Status"
              >
                <option value="all" className="bg-[#121215]">
                  All Statuses
                </option>
                <option value="active" className="bg-[#121215]">
                  Active
                </option>
                <option value="suspended" className="bg-[#121215]">
                  Suspended
                </option>
                <option value="pending" className="bg-[#121215]">
                  Pending Approval
                </option>
              </select>
            </div>
          </div>

          {/* Users List */}
          <div className="mt-4 space-y-2.5">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12 text-xs text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#84CC16]" />
                Loading platform users and workspaces...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 bg-[#09090B]/60 py-10 text-center text-xs text-zinc-500">
                No users or workspaces match your current filter criteria.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isExpanded = Boolean(expandedEmails[u.email]);
                const totalUserTokens = u.workspaces.reduce(
                  (acc, ws) => acc + (ws.tokens_used_this_month || 0),
                  0
                );

                return (
                  <div
                    key={u.email}
                    className="overflow-hidden rounded-xl border border-zinc-800/90 bg-[#09090B]"
                  >
                    {/* Summary Row */}
                    <button
                      type="button"
                      onClick={() => toggleExpandUser(u.email)}
                      className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-3.5 text-left transition hover:bg-[#18181B]/70"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-[#84CC16]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                        )}

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-[#121215] text-xs font-extrabold uppercase text-[#A3E635]">
                          {u.full_name.charAt(0) || "U"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-bold text-white">
                              {u.full_name}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                                u.primary_role === "owner"
                                  ? "border border-[#84CC16]/35 bg-[#84CC16]/15 text-[#A3E635]"
                                  : "border border-zinc-700 bg-zinc-800/80 text-zinc-300"
                              }`}
                            >
                              {u.primary_role}
                            </span>
                          </div>
                          <p className="truncate font-mono text-xs text-zinc-400">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="rounded-lg border border-zinc-800 bg-[#121215] px-2.5 py-1 font-mono text-[11px] text-zinc-300">
                          {u.signup_method}
                        </span>

                        <span className="rounded-lg border border-zinc-800 bg-[#121215] px-2.5 py-1 font-mono text-[11px] text-zinc-300">
                          {u.workspaces.length} Workspace
                          {u.workspaces.length === 1 ? "" : "s"}
                        </span>

                        <span className="rounded-lg border border-zinc-800 bg-[#121215] px-2.5 py-1 font-mono text-[11px] text-[#A3E635]">
                          {formatCompactNumber(totalUserTokens)} tokens
                        </span>
                      </div>
                    </button>

                    {/* Expanded Row Details */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800/80 bg-[#121215]/70 p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-400">
                          <span>
                            User ID:{" "}
                            <code className="font-mono text-zinc-200">
                              {u.user_id}
                            </code>
                          </span>
                          <span>
                            Owned:{" "}
                            <strong className="text-white">
                              {u.owned_workspaces_count}
                            </strong>{" "}
                            • Joined:{" "}
                            <strong className="text-white">
                              {u.joined_workspaces_count}
                            </strong>
                          </span>
                          <span>
                            Registered:{" "}
                            <strong className="text-zinc-200">
                              {u.created_at
                                ? new Date(u.created_at).toLocaleDateString()
                                : "Active"}
                            </strong>
                          </span>
                        </div>

                        {u.workspaces.length === 0 ? (
                          <p className="text-xs text-zinc-500">
                            No workspaces linked to this user account.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {u.workspaces.map((ws) => {
                              const isWsBusy = busyWorkspaceId === ws.id;
                              const quotaInput =
                                directoryQuotas[ws.id] ??
                                ws.monthly_token_limit;
                              const pct = ws.usage_percent || 0;
                              const barColor =
                                pct >= 90
                                  ? "bg-rose-500"
                                  : pct >= 75
                                  ? "bg-amber-400"
                                  : "bg-[#84CC16]";

                              return (
                                <div
                                  key={ws.id}
                                  className="flex flex-col justify-between gap-3 rounded-xl border border-zinc-800 bg-[#09090B] p-4"
                                >
                                  <div className="space-y-3">
                                    {/* Workspace Top Row */}
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="text-sm font-bold text-white">
                                            {ws.name}
                                          </h4>
                                          <span
                                            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                                              ws.is_active
                                                ? "bg-[#84CC16]/15 text-[#A3E635]"
                                                : "bg-rose-500/15 text-rose-400"
                                            }`}
                                          >
                                            {ws.is_active
                                              ? "ACTIVE"
                                              : "SUSPENDED"}
                                          </span>
                                        </div>
                                        <p className="font-mono text-[11px] text-zinc-500">
                                          /{ws.slug} • Role:{" "}
                                          <span className="uppercase text-zinc-300">
                                            {ws.member_role}
                                          </span>
                                        </p>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="rounded-md border border-zinc-800 bg-[#121215] px-2 py-0.5 text-[11px] text-zinc-300">
                                          {formatIndustryLabel(ws.industry)}
                                        </span>
                                        <span
                                          className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                                            ws.plan_mode === "managed"
                                              ? "border border-[#84CC16]/35 bg-[#84CC16]/15 text-[#A3E635]"
                                              : "border border-zinc-700 bg-zinc-800 text-zinc-300"
                                          }`}
                                        >
                                          {formatPlanTierLabel(ws.plan_tier)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Token Usage Progress Bar */}
                                    <div className="space-y-1.5 rounded-lg border border-zinc-800/80 bg-[#121215] p-3">
                                      <div className="flex items-center justify-between text-[11px]">
                                        <span className="flex items-center gap-1 text-zinc-400">
                                          <Activity className="h-3 w-3 text-[#84CC16]" />
                                          Monthly Token Consumption
                                        </span>
                                        <span className="font-mono text-zinc-200">
                                          {ws.tokens_used_this_month.toLocaleString()}{" "}
                                          /{" "}
                                          {ws.monthly_token_limit > 0
                                            ? ws.monthly_token_limit.toLocaleString()
                                            : "BYOK Unlimited"}{" "}
                                          {ws.monthly_token_limit > 0 &&
                                            `(${pct}%)`}
                                        </span>
                                      </div>

                                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                                        <div
                                          className={`h-full rounded-full transition-all ${barColor}`}
                                          style={{
                                            width: `${
                                              ws.monthly_token_limit > 0
                                                ? Math.min(100, pct)
                                                : 0
                                            }%`,
                                          }}
                                        />
                                      </div>

                                      {/* Inline Quota Editor */}
                                      <div className="flex items-center gap-2 pt-1">
                                        <input
                                          type="number"
                                          min={0}
                                          step={100000}
                                          value={quotaInput}
                                          onChange={(e) =>
                                            setDirectoryQuotas((prev) => ({
                                              ...prev,
                                              [ws.id]: Math.max(
                                                0,
                                                Number(e.target.value) || 0
                                              ),
                                            }))
                                          }
                                          className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 py-1 font-mono text-[11px] text-white outline-none focus:border-[#84CC16]"
                                        />
                                        <button
                                          type="button"
                                          disabled={isWsBusy}
                                          onClick={() =>
                                            handleWorkspaceDecision(
                                              ws.id,
                                              {
                                                action: "update_quota",
                                                monthly_token_limit: quotaInput,
                                              },
                                              `Updated monthly token limit for ${ws.name} to ${quotaInput.toLocaleString()}.`
                                            )
                                          }
                                          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition hover:border-[#84CC16] hover:text-[#A3E635] disabled:opacity-50"
                                        >
                                          Set Quota
                                        </button>
                                      </div>
                                    </div>

                                    {/* Configured Agents List */}
                                    <div>
                                      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                        <Cpu className="h-3 w-3 text-[#84CC16]" />
                                        Configured Agents (
                                        {ws.configured_agents.length})
                                      </p>
                                      {ws.configured_agents.length === 0 ? (
                                        <p className="text-[11px] text-zinc-500">
                                          No custom agent configs saved yet.
                                        </p>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                          {ws.configured_agents.map((ag) => (
                                            <span
                                              key={ag.id}
                                              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#121215] px-2.5 py-1 font-mono text-[11px] text-zinc-300"
                                            >
                                              <span className="h-1.5 w-1.5 rounded-full bg-[#84CC16]" />
                                              <span className="font-semibold text-white">
                                                {ag.agent_type}
                                              </span>
                                              <span className="text-zinc-500">
                                                ({ag.provider}/{ag.model_name})
                                              </span>
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Suspend / Reactivate Footer Control */}
                                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                                    <span className="font-mono text-[10px] text-zinc-500">
                                      ID: {ws.id}
                                    </span>

                                    {ws.is_active ? (
                                      <button
                                        type="button"
                                        disabled={isWsBusy}
                                        onClick={() =>
                                          handleWorkspaceDecision(
                                            ws.id,
                                            { action: "suspend" },
                                            `Suspended workspace '${ws.name}'.`
                                          )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                                      >
                                        <PauseCircle className="h-3.5 w-3.5" />
                                        Suspend Workspace
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={isWsBusy}
                                        onClick={() =>
                                          handleWorkspaceDecision(
                                            ws.id,
                                            { action: "reactivate" },
                                            `Reactivated workspace '${ws.name}'.`
                                          )
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-1.5 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B] disabled:opacity-50"
                                      >
                                        <PlayCircle className="h-3.5 w-3.5" />
                                        Reactivate Workspace
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}