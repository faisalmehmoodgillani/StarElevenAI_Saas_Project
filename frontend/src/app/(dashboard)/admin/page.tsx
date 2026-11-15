"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  Building2,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coins,
  Cpu,
  Filter,
  Gift,
  Layers,
  Loader2,
  MessageSquare,
  PauseCircle,
  Percent,
  PlayCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type AdminTabKey =
  | "overview"
  | "approvals"
  | "directory"
  | "deals"
  | "governance";

const ADMIN_TAB_STORAGE_KEY = "stareleven_admin_active_tab_v2";

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
  discount_percent: number;
  custom_monthly_price?: number | null;
  discount_note?: string | null;
  applied_promo_code?: string | null;
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
  max_workspaces_allowed: number;
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
  discount_percent: number;
  custom_monthly_price?: number | null;
  applied_promo_code?: string | null;
  created_at?: string | null;
}

interface PromoCodeItem {
  id: string;
  code: string;
  discount_percent: number;
  bonus_tokens: number;
  extra_workspaces: number;
  max_uses: number;
  times_used: number;
  expires_at?: string | null;
  is_active: boolean;
  created_at?: string | null;
}

<Link
  href="/admin/health"
  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25"
>
  <Activity className="h-3.5 w-3.5 text-amber-400" />
  Health Diagnostics
</Link>

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

  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(
      ADMIN_TAB_STORAGE_KEY
    ) as AdminTabKey | null;
    if (
      saved &&
      ["overview", "approvals", "directory", "deals", "governance"].includes(
        saved
      )
    ) {
      setActiveTab(saved);
    }
  }, []);

  const handleSelectTab = (tab: AdminTabKey) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, tab);
    }
  };

  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [usersDirectory, setUsersDirectory] = useState<AdminUserRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    PendingManagedRequest[]
  >([]);
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Per-workspace & per-user inline controls
  const [approvalQuotas, setApprovalQuotas] = useState<Record<string, number>>(
    {}
  );
  const [directoryQuotas, setDirectoryQuotas] = useState<
    Record<string, number>
  >({});
  const [userAllowances, setUserAllowances] = useState<Record<string, number>>(
    {}
  );
  const [discountInputs, setDiscountInputs] = useState<
    Record<string, { percent: number; customPrice: string; note: string }>
  >({});
  const [selectedPlanAssign, setSelectedPlanAssign] = useState<
    Record<string, string>
  >({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Promo code creation form
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoDiscountInput, setPromoDiscountInput] = useState(25);
  const [promoBonusTokensInput, setPromoBonusTokensInput] = useState(500000);
  const [promoExtraWsInput, setPromoExtraWsInput] = useState(0);
  const [promoMaxUsesInput, setPromoMaxUsesInput] = useState(50);
  const [promoValidDaysInput, setPromoValidDaysInput] = useState(30);

  // Directory filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [planModeFilter, setPlanModeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>(
    {}
  );

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

      const [overviewRes, usersRes, promosRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/overview`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/users`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/admin/promo-codes`, { headers }),
      ]);

      if (!overviewRes.ok) {
        const err = await overviewRes.json().catch(() => ({}));
        throw new Error(
          err.detail ||
            `Failed to load platform overview (${overviewRes.status})`
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
      const promosData = promosRes.ok
        ? await promosRes.json()
        : { promo_codes: [] };

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
      setPromoCodes(
        Array.isArray(promosData.promo_codes) ? promosData.promo_codes : []
      );

      setApprovalQuotas((prev) => {
        const next = { ...prev };
        for (const req of fetchedPending) {
          if (next[req.workspace_id] === undefined) {
            next[req.workspace_id] = req.default_monthly_token_limit;
          }
        }
        return next;
      });

      setUserAllowances((prev) => {
        const next = { ...prev };
        for (const u of fetchedUsers) {
          if (next[u.email] === undefined) {
            next[u.email] = u.max_workspaces_allowed || 1;
          }
        }
        return next;
      });

      setDirectoryQuotas((prev) => {
        const next = { ...prev };
        for (const u of fetchedUsers) {
          for (const ws of u.workspaces) {
            next[ws.id] = ws.monthly_token_limit;
          }
        }
        return next;
      });

      setDiscountInputs((prev) => {
        const next = { ...prev };
        for (const u of fetchedUsers) {
          for (const ws of u.workspaces) {
            if (next[ws.id] === undefined) {
              next[ws.id] = {
                percent: ws.discount_percent || 0,
                customPrice:
                  ws.custom_monthly_price !== null &&
                  ws.custom_monthly_price !== undefined
                    ? String(ws.custom_monthly_price)
                    : "",
                note: ws.discount_note || "",
              };
            }
          }
        }
        return next;
      });

      setSelectedPlanAssign((prev) => {
        const next = { ...prev };
        for (const u of fetchedUsers) {
          for (const ws of u.workspaces) {
            if (next[ws.id] === undefined) {
              next[ws.id] = ws.plan_tier || "managed_starter";
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
    payload: Record<string, unknown>,
    successMessage: string
  ) => {
    if (!resolvedEmail) return;
    setBusyKey(workspaceId);
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
          err.detail || `Administrative action failed (${response.status})`
        );
      }

      setStatusBanner(successMessage);
      await loadAdminTelemetry();
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to update workspace."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateUserAllowance = async (
    targetEmail: string,
    newAllowance: number
  ) => {
    if (!resolvedEmail) return;
    setBusyKey(`user:${targetEmail}`);
    setErrorBanner(null);
    setStatusBanner(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/admin/users/${encodeURIComponent(
          targetEmail
        )}/allowance`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-User-Email": resolvedEmail,
          },
          body: JSON.stringify({
            max_workspaces_allowed: Math.max(1, newAllowance),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update workspace allowance.");
      }

      setUserAllowances((prev) => ({
        ...prev,
        [targetEmail]: Math.max(1, newAllowance),
      }));
      setStatusBanner(
        `Updated workspace allowance for ${targetEmail} to ${Math.max(
          1,
          newAllowance
        )} workspace(s).`
      );
      await loadAdminTelemetry();
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error
          ? err.message
          : "Unable to update user workspace allowance."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedEmail || !promoCodeInput.trim()) return;
    setBusyKey("create_promo");
    setErrorBanner(null);
    setStatusBanner(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/promo-codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": resolvedEmail,
        },
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          discount_percent: promoDiscountInput,
          bonus_tokens: promoBonusTokensInput,
          extra_workspaces: promoExtraWsInput,
          max_uses: promoMaxUsesInput,
          valid_days: promoValidDaysInput,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create promo code.");
      }

      setStatusBanner(
        `Created promo code '${promoCodeInput.trim().toUpperCase()}'.`
      );
      setPromoCodeInput("");
      await loadAdminTelemetry();
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Failed to create promo code."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleOrDeletePromo = async (
    promoId: string,
    mode: "toggle" | "delete"
  ) => {
    if (!resolvedEmail) return;
    setBusyKey(`promo:${promoId}`);
    setErrorBanner(null);
    setStatusBanner(null);

    try {
      const url =
        mode === "toggle"
          ? `${API_BASE_URL}/api/v1/admin/promo-codes/${promoId}/toggle`
          : `${API_BASE_URL}/api/v1/admin/promo-codes/${promoId}`;

      const res = await fetch(url, {
        method: mode === "toggle" ? "PATCH" : "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": resolvedEmail,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to ${mode} promo code.`);
      }

      setStatusBanner(
        mode === "toggle"
          ? "Updated promo code active status."
          : "Deleted promo code."
      );
      await loadAdminTelemetry();
    } catch (err: unknown) {
      setErrorBanner(
        err instanceof Error ? err.message : "Promo action failed."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const toggleExpandUser = (email: string) => {
    setExpandedEmails((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  const allUniqueWorkspaces = useMemo(() => {
    const map = new Map<
      string,
      AdminWorkspaceItem & { owner_email: string; owner_name: string }
    >();

    for (const u of usersDirectory) {
      for (const ws of u.workspaces) {
        const existing = map.get(ws.id);
        if (!existing || ws.member_role === "owner") {
          map.set(ws.id, {
            ...ws,
            owner_email:
              ws.member_role === "owner"
                ? u.email
                : existing?.owner_email || u.email,
            owner_name:
              ws.member_role === "owner"
                ? u.full_name
                : existing?.owner_name || u.full_name,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [usersDirectory]);

  const activeManagedWorkspaces = useMemo(
    () =>
      allUniqueWorkspaces.filter(
        (ws) =>
          ws.plan_mode === "managed" && ws.managed_request_status !== "pending"
      ),
    [allUniqueWorkspaces]
  );

  const highUsageOrSuspendedWorkspaces = useMemo(
    () =>
      allUniqueWorkspaces.filter(
        (ws) =>
          !ws.is_active ||
          (ws.monthly_token_limit > 0 && ws.usage_percent >= 75)
      ),
    [allUniqueWorkspaces]
  );

  const platformAgentsRegistry = useMemo(() => {
    const items: Array<{
      id: string;
      agent_type: string;
      provider: string;
      model_name: string;
      has_custom_key: boolean;
      workspace_name: string;
      workspace_slug: string;
      industry: string;
    }> = [];

    for (const ws of allUniqueWorkspaces) {
      for (const ag of ws.configured_agents) {
        items.push({
          id: ag.id,
          agent_type: ag.agent_type,
          provider: ag.provider,
          model_name: ag.model_name,
          has_custom_key: ag.has_custom_key,
          workspace_name: ws.name,
          workspace_slug: ws.slug,
          industry: ws.industry,
        });
      }
    }
    return items;
  }, [allUniqueWorkspaces]);

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
                Root Governance • Commercial Command Center
              </span>
            </div>
            <h1 className="mt-1.5 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-white">
              <ShieldCheck className="h-6 w-6 text-[#84CC16]" />
              Super Admin Command Center
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Platform telemetry, Managed Plan approvals, bonus tokens, extra
              workspace grants, and commercial promo discounts.
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

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/90 bg-[#121215] p-2">
          <button
            type="button"
            onClick={() => handleSelectTab("overview")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "overview"
                ? "bg-[#84CC16] text-[#09090B] shadow-md shadow-[#84CC16]/20"
                : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-100"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Overview &amp; Figures</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("approvals")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "approvals"
                ? "bg-[#84CC16] text-[#09090B] shadow-md shadow-[#84CC16]/20"
                : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-100"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Managed Approvals</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                activeTab === "approvals"
                  ? "bg-[#09090B]/20 text-[#09090B]"
                  : pendingRequests.length > 0
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {pendingRequests.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("directory")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "directory"
                ? "bg-[#84CC16] text-[#09090B] shadow-md shadow-[#84CC16]/20"
                : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-100"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users, Quotas &amp; Grants</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                activeTab === "directory"
                  ? "bg-[#09090B]/20 text-[#09090B]"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {usersDirectory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("deals")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "deals"
                ? "bg-[#84CC16] text-[#09090B] shadow-md shadow-[#84CC16]/20"
                : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-100"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Deals &amp; Promo Codes</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                activeTab === "deals"
                  ? "bg-[#09090B]/20 text-[#09090B]"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {promoCodes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab("governance")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "governance"
                ? "bg-[#84CC16] text-[#09090B] shadow-md shadow-[#84CC16]/20"
                : "text-zinc-400 hover:bg-[#18181B] hover:text-zinc-100"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>Agents &amp; Watchlist</span>
            {highUsageOrSuspendedWorkspaces.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                  activeTab === "governance"
                    ? "bg-[#09090B]/20 text-[#09090B]"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {highUsageOrSuspendedWorkspaces.length}
              </span>
            )}
          </button>
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

        {/* ================================================================= */}
        {/* TAB 1: OVERVIEW & PLATFORM FIGURES                                */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {pendingRequests.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-200">
                      {pendingRequests.length} Managed Plan Upgrade Request
                      {pendingRequests.length === 1 ? "" : "s"} Awaiting
                      Approval
                    </p>
                    <p className="text-[11px] text-amber-300/80">
                      Review requested plan tiers, customize monthly token
                      quotas, and activate workspaces.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTab("approvals")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-[#09090B] transition hover:bg-amber-300"
                >
                  <span>Review Queue</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* 5 Core KPI Cards */}
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
                  LangGraph Threads
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
                  {formatCompactNumber(
                    overview?.total_monthly_token_quota ?? 0
                  )}{" "}
                  tokens/mo
                </p>
              </div>
            </div>

            {/* Plan Tier Distribution & Workspace Health */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
                <h2 className="text-sm font-bold text-white">
                  Workspaces by Subscription Tier
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Distribution across BYOK Free and Managed SaaS plans.
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    { key: "byok_free", label: "BYOK Free" },
                    { key: "managed_starter", label: "Managed Starter" },
                    { key: "managed_growth", label: "Managed Growth" },
                    { key: "managed_enterprise", label: "Managed Agency" },
                  ].map((tier) => {
                    const count =
                      overview?.workspaces_by_plan_tier?.[tier.key] ?? 0;
                    const total = overview?.total_workspaces || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <div key={tier.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300">{tier.label}</span>
                          <span className="font-mono text-zinc-400">
                            {count} ({overview?.total_workspaces ? pct : 0}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-[#84CC16]"
                            style={{
                              width: `${
                                overview?.total_workspaces ? pct : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
                <h2 className="text-sm font-bold text-white">
                  Workspace Status &amp; Approval Health
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Operational status and Managed Plan request states.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3.5">
                    <span className="text-[11px] text-zinc-400">
                      Active Workspaces
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-[#A3E635]">
                      {overview?.active_workspaces ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3.5">
                    <span className="text-[11px] text-zinc-400">
                      Suspended Workspaces
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-rose-400">
                      {overview?.suspended_workspaces ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3.5">
                    <span className="text-[11px] text-zinc-400">
                      Approved Managed
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-white">
                      {overview?.workspaces_by_request_status?.approved ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3.5">
                    <span className="text-[11px] text-zinc-400">
                      Pending Requests
                    </span>
                    <p className="mt-1 font-mono text-xl font-extrabold text-amber-300">
                      {overview?.workspaces_by_request_status?.pending ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Industry Distribution Pills */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#84CC16]" />
                  <h2 className="text-sm font-bold text-white">
                    Workspace Industry Distribution
                  </h2>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Click any industry pill to inspect matching workspaces
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {overview?.industry_distribution &&
                overview.industry_distribution.length > 0 ? (
                  overview.industry_distribution.map((item) => (
                    <button
                      key={item.industry}
                      type="button"
                      onClick={() => {
                        setIndustryFilter(item.industry);
                        handleSelectTab("directory");
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#09090B] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-[#84CC16] hover:text-[#A3E635]"
                    >
                      <span>{item.label}</span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-bold text-[#A3E635]">
                        {item.count}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500">
                        ({item.percentage}%)
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">
                    No workspace industry records available yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: MANAGED PLAN APPROVAL QUEUE                                */}
        {/* ================================================================= */}
        {activeTab === "approvals" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#84CC16]/15 text-[#84CC16]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Pending Managed Plan Requests
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Approve or reject Managed Plan upgrades, customize monthly
                      token quotas, and activate 30-day billing cycles.
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
                  {pendingRequests.length} Pending
                </span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-[#09090B]/60 py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-[#84CC16]" />
                  <p className="mt-2.5 text-sm font-bold text-zinc-200">
                    Approval Queue is Clear
                  </p>
                  <p className="mt-1 max-w-md text-xs text-zinc-500">
                    There are no pending Managed Plan upgrade requests right
                    now. You can also directly assign a Managed Plan or bonus
                    tokens to any user from the Users, Quotas &amp; Grants tab.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {pendingRequests.map((req) => {
                    const isBusy = busyKey === req.workspace_id;
                    const quotaValue =
                      approvalQuotas[req.workspace_id] ??
                      req.default_monthly_token_limit;

                    return (
                      <div
                        key={req.workspace_id}
                        className="flex flex-col justify-between gap-4 rounded-xl border border-amber-500/35 bg-[#09090B] p-5"
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-bold text-white">
                                {req.workspace_name}
                              </h3>
                              <p className="font-mono text-[11px] text-zinc-500">
                                /{req.slug} • ID:{" "}
                                {req.workspace_id.slice(0, 8)}...
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md border border-[#84CC16]/35 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#A3E635]">
                                {formatPlanTierLabel(req.requested_plan_tier)}
                              </span>
                              <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
                                {req.billing_interval}
                              </span>
                              {req.discount_percent > 0 && (
                                <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                  {req.discount_percent}% OFF
                                </span>
                              )}
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
                              Monthly Token Quota (Editable)
                            </label>
                            <div className="mt-1.5 flex items-center gap-2">
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
                                className="w-full rounded-lg border border-zinc-800 bg-[#121215] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                              />
                              <span className="shrink-0 font-mono text-[11px] text-zinc-500">
                                ({formatCompactNumber(quotaValue)})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800/80 pt-3.5">
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
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
                                )} for ${
                                  req.workspace_name
                                } (${quotaValue.toLocaleString()} tokens/mo).`
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

            {/* Active Managed Plan Workspaces */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Active Managed Plan Workspaces
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Workspaces currently running on StarEleven Managed API
                    infrastructure.
                  </p>
                </div>
                <span className="font-mono text-xs text-[#A3E635]">
                  {activeManagedWorkspaces.length} Active Managed
                </span>
              </div>

              {activeManagedWorkspaces.length === 0 ? (
                <p className="mt-4 text-xs text-zinc-500">
                  No workspaces are currently on an approved Managed Plan.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {activeManagedWorkspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-[#09090B] p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-xs font-bold text-white">
                            {ws.name}
                          </p>
                          <span className="rounded bg-[#84CC16]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                            {formatPlanTierLabel(ws.plan_tier)}
                          </span>
                          {ws.discount_percent > 0 && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                              {ws.discount_percent}% OFF
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
                          {ws.owner_email} •{" "}
                          {ws.tokens_used_this_month.toLocaleString()} /{" "}
                          {ws.monthly_token_limit.toLocaleString()} tokens
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={busyKey === ws.id}
                        onClick={() =>
                          handleWorkspaceDecision(
                            ws.id,
                            { action: "reject_managed" },
                            `Revoked Managed Plan for ${ws.name} (switched to BYOK Free).`
                          )
                        }
                        className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50"
                      >
                        Revoke to BYOK
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: USERS, QUOTAS, EXTRA WORKSPACES & COMMERCIAL GRANTS        */}
        {/* ================================================================= */}
        {activeTab === "directory" && (
          <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-base font-bold text-white">
                  Users, Extra Workspace Grants &amp; Token Top-Ups
                </h2>
                <p className="text-xs text-zinc-400">
                  Expand any user to grant extra workspaces, add bonus tokens,
                  assign plans directly, apply custom discounts, or suspend
                  workspaces.
                </p>
              </div>

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
                  const allowanceVal =
                    userAllowances[u.email] ?? u.max_workspaces_allowed ?? 1;
                  const isUserBusy = busyKey === `user:${u.email}`;

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

                        <div className="flex flex-wrap items-center gap-2.5 text-xs">
                          <span className="rounded-lg border border-zinc-800 bg-[#121215] px-2.5 py-1 font-mono text-[11px] text-zinc-300">
                            Slots: {u.owned_workspaces_count} /{" "}
                            <strong className="text-[#A3E635]">
                              {u.max_workspaces_allowed || 1}
                            </strong>
                          </span>

                          <span className="rounded-lg border border-zinc-800 bg-[#121215] px-2.5 py-1 font-mono text-[11px] text-[#A3E635]">
                            {formatCompactNumber(totalUserTokens)} tokens
                          </span>
                        </div>
                      </button>

                      {/* Expanded User Grants & Workspaces */}
                      {isExpanded && (
                        <div className="space-y-4 border-t border-zinc-800/80 bg-[#121215]/70 p-4">
                          {/* User-Level Grant Bar: Extra Workspaces Allowance */}
                          <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#84CC16]/30 bg-[#09090B] p-3.5 sm:flex-row sm:items-center">
                            <div>
                              <p className="flex items-center gap-1.5 text-xs font-bold text-white">
                                <Building2 className="h-3.5 w-3.5 text-[#84CC16]" />
                                User Workspace Slots Allowance
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                Default limit is 1 workspace. Grant extra
                                workspace slots so this client can create
                                additional business workspaces.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {[1, 3, 5, 10].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  disabled={isUserBusy}
                                  onClick={() =>
                                    handleUpdateUserAllowance(u.email, preset)
                                  }
                                  className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition ${
                                    allowanceVal === preset
                                      ? "border-[#84CC16] bg-[#84CC16] text-[#09090B]"
                                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-[#84CC16]"
                                  }`}
                                >
                                  {preset} WS
                                </button>
                              ))}

                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={allowanceVal}
                                onChange={(e) =>
                                  setUserAllowances((prev) => ({
                                    ...prev,
                                    [u.email]: Math.max(
                                      1,
                                      Number(e.target.value) || 1
                                    ),
                                  }))
                                }
                                className="w-16 rounded-lg border border-zinc-800 bg-[#121215] px-2 py-1 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                              />

                              <button
                                type="button"
                                disabled={isUserBusy}
                                onClick={() =>
                                  handleUpdateUserAllowance(
                                    u.email,
                                    allowanceVal
                                  )
                                }
                                className="rounded-lg bg-[#84CC16] px-3 py-1 text-xs font-extrabold text-[#09090B] hover:bg-[#A3E635] disabled:opacity-50"
                              >
                                Save Slots
                              </button>
                            </div>
                          </div>

                          {/* Workspaces Grid */}
                          {u.workspaces.length === 0 ? (
                            <p className="text-xs text-zinc-500">
                              No workspaces linked to this user account.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              {u.workspaces.map((ws) => {
                                const isWsBusy = busyKey === ws.id;
                                const quotaInput =
                                  directoryQuotas[ws.id] ??
                                  ws.monthly_token_limit;
                                const discountState = discountInputs[ws.id] || {
                                  percent: ws.discount_percent || 0,
                                  customPrice: "",
                                  note: "",
                                };
                                const planChoice =
                                  selectedPlanAssign[ws.id] ||
                                  ws.plan_tier ||
                                  "managed_starter";
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
                                      {/* Workspace Header */}
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
                                            {ws.billing_cycle_end &&
                                              ` • Renews: ${new Date(
                                                ws.billing_cycle_end
                                              ).toLocaleDateString()}`}
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
                                          {ws.discount_percent > 0 && (
                                            <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                              {ws.discount_percent}% OFF
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* 1. Token Quota & Quick Bonus Top-Ups */}
                                      <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-[#121215] p-3">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="flex items-center gap-1 text-zinc-400">
                                            <Activity className="h-3 w-3 text-[#84CC16]" />
                                            Monthly Token Pool
                                          </span>
                                          <span className="font-mono text-zinc-200">
                                            {ws.tokens_used_this_month.toLocaleString()}{" "}
                                            /{" "}
                                            {ws.monthly_token_limit > 0
                                              ? ws.monthly_token_limit.toLocaleString()
                                              : "0 (BYOK)"}{" "}
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

                                        {/* Quick Bonus Top-Up Buttons */}
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-zinc-400">
                                            <Gift className="h-3 w-3 text-[#84CC16]" />
                                            Bonus Top-Up:
                                          </span>
                                          {[
                                            { label: "+500K", val: 500_000 },
                                            { label: "+2M", val: 2_000_000 },
                                            { label: "+5M", val: 5_000_000 },
                                          ].map((b) => (
                                            <button
                                              key={b.label}
                                              type="button"
                                              disabled={isWsBusy}
                                              onClick={() =>
                                                handleWorkspaceDecision(
                                                  ws.id,
                                                  {
                                                    action: "add_bonus_tokens",
                                                    bonus_tokens: b.val,
                                                  },
                                                  `Added ${b.label} bonus tokens to ${ws.name}.`
                                                )
                                              }
                                              className="rounded border border-[#84CC16]/35 bg-[#84CC16]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#A3E635] hover:bg-[#84CC16] hover:text-[#09090B]"
                                            >
                                              {b.label}
                                            </button>
                                          ))}
                                          <button
                                            type="button"
                                            disabled={isWsBusy}
                                            onClick={() =>
                                              handleWorkspaceDecision(
                                                ws.id,
                                                {
                                                  action:
                                                    "reset_monthly_usage",
                                                },
                                                `Reset monthly token usage counter to 0 for ${ws.name}.`
                                              )
                                            }
                                            className="ml-auto inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300 hover:border-amber-400 hover:text-amber-300"
                                            title="Reset used tokens to 0"
                                          >
                                            <RotateCcw className="h-2.5 w-2.5" />
                                            Reset Used
                                          </button>
                                        </div>

                                        {/* Exact Quota Set */}
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
                                                  monthly_token_limit:
                                                    quotaInput,
                                                },
                                                `Set monthly token quota for ${
                                                  ws.name
                                                } to ${quotaInput.toLocaleString()}.`
                                              )
                                            }
                                            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:border-[#84CC16] hover:text-[#A3E635]"
                                          >
                                            Set Exact Quota
                                          </button>
                                        </div>
                                      </div>

                                      {/* 2. Direct Plan Assignment & Cycle Extension */}
                                      <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-[#121215] p-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                                            Direct Plan Assign &amp; Cycle Days
                                          </span>
                                          <button
                                            type="button"
                                            disabled={isWsBusy}
                                            onClick={() =>
                                              handleWorkspaceDecision(
                                                ws.id,
                                                {
                                                  action: "extend_cycle",
                                                  extra_days: 30,
                                                },
                                                `Extended billing cycle by +30 days for ${ws.name}.`
                                              )
                                            }
                                            className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-[#A3E635] hover:border-[#84CC16]"
                                          >
                                            <CalendarPlus className="h-3 w-3" />
                                            +30 Days
                                          </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <select
                                            value={planChoice}
                                            onChange={(e) =>
                                              setSelectedPlanAssign((prev) => ({
                                                ...prev,
                                                [ws.id]: e.target.value,
                                              }))
                                            }
                                            className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-[#84CC16]"
                                          >
                                            <option value="byok_free">
                                              BYOK Free ($0)
                                            </option>
                                            <option value="managed_starter">
                                              Managed Starter (2M tokens)
                                            </option>
                                            <option value="managed_growth">
                                              Managed Growth (10M tokens)
                                            </option>
                                            <option value="managed_enterprise">
                                              Managed Agency (35M tokens)
                                            </option>
                                          </select>

                                          <button
                                            type="button"
                                            disabled={isWsBusy}
                                            onClick={() =>
                                              handleWorkspaceDecision(
                                                ws.id,
                                                {
                                                  action: "assign_plan",
                                                  plan_tier: planChoice,
                                                },
                                                `Assigned ${formatPlanTierLabel(
                                                  planChoice
                                                )} directly to ${ws.name}.`
                                              )
                                            }
                                            className="shrink-0 rounded-lg bg-[#84CC16] px-3 py-1.5 text-[11px] font-extrabold text-[#09090B] hover:bg-[#A3E635]"
                                          >
                                            Apply Plan
                                          </button>
                                        </div>
                                      </div>

                                      {/* 3. Custom Discount / Deal Pricing */}
                                      <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-[#121215] p-3">
                                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                                          <Percent className="h-3 w-3" />
                                          Custom Workspace Discount / Deal Price
                                        </span>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="text-[10px] text-zinc-500">
                                              Discount %
                                            </label>
                                            <input
                                              type="number"
                                              min={0}
                                              max={100}
                                              value={discountState.percent}
                                              onChange={(e) =>
                                                setDiscountInputs((prev) => ({
                                                  ...prev,
                                                  [ws.id]: {
                                                    ...discountState,
                                                    percent: Math.min(
                                                      100,
                                                      Math.max(
                                                        0,
                                                        Number(
                                                          e.target.value
                                                        ) || 0
                                                      )
                                                    ),
                                                  },
                                                }))
                                              }
                                              className="mt-0.5 w-full rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 py-1 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                                            />
                                          </div>

                                          <div>
                                            <label className="text-[10px] text-zinc-500">
                                              Custom Price ($/mo)
                                            </label>
                                            <input
                                              type="number"
                                              min={0}
                                              step="0.01"
                                              placeholder="Optional"
                                              value={discountState.customPrice}
                                              onChange={(e) =>
                                                setDiscountInputs((prev) => ({
                                                  ...prev,
                                                  [ws.id]: {
                                                    ...discountState,
                                                    customPrice: e.target.value,
                                                  },
                                                }))
                                              }
                                              className="mt-0.5 w-full rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 py-1 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                                            />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            placeholder="Deal note (e.g. Agency Partner 30% Off)"
                                            value={discountState.note}
                                            onChange={(e) =>
                                              setDiscountInputs((prev) => ({
                                                ...prev,
                                                [ws.id]: {
                                                  ...discountState,
                                                  note: e.target.value,
                                                },
                                              }))
                                            }
                                            className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-[#84CC16]"
                                          />
                                          <button
                                            type="button"
                                            disabled={isWsBusy}
                                            onClick={() =>
                                              handleWorkspaceDecision(
                                                ws.id,
                                                {
                                                  action: "set_discount",
                                                  discount_percent:
                                                    discountState.percent,
                                                  custom_monthly_price:
                                                    discountState.customPrice !==
                                                    ""
                                                      ? Number(
                                                          discountState.customPrice
                                                        )
                                                      : null,
                                                  discount_note:
                                                    discountState.note || null,
                                                },
                                                `Saved custom discount (${discountState.percent}% OFF) for ${ws.name}.`
                                              )
                                            }
                                            className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400 hover:text-[#09090B]"
                                          >
                                            Save Deal
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Suspend / Reactivate Footer */}
                                    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                                      <span className="font-mono text-[10px] text-zinc-500">
                                        Agents: {ws.configured_agents.length}
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
        )}

        {/* ================================================================= */}
        {/* TAB 4: DEALS & PROMO CODES                                        */}
        {/* ================================================================= */}
        {activeTab === "deals" && (
          <div className="space-y-6">
            {/* Create Promo Code Card */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
              <div className="border-b border-zinc-800/80 pb-4">
                <h2 className="text-base font-bold text-white">
                  Create Promotional Discount Code
                </h2>
                <p className="text-xs text-zinc-400">
                  Generate promo codes with percentage discounts, bonus tokens,
                  and extra workspace slots that clients can redeem on /pricing.
                </p>
              </div>

              <form
                onSubmit={handleCreatePromoCode}
                className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
              >
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="AGENCY30"
                    value={promoCodeInput}
                    onChange={(e) =>
                      setPromoCodeInput(e.target.value.toUpperCase())
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 font-mono text-xs uppercase text-[#A3E635] outline-none focus:border-[#84CC16]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={promoDiscountInput}
                    onChange={(e) =>
                      setPromoDiscountInput(Number(e.target.value) || 0)
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400">
                    Bonus Tokens
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={promoBonusTokensInput}
                    onChange={(e) =>
                      setPromoBonusTokensInput(Number(e.target.value) || 0)
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400">
                    Extra Workspaces
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={promoExtraWsInput}
                    onChange={(e) =>
                      setPromoExtraWsInput(Number(e.target.value) || 0)
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400">
                    Max Uses / Days
                  </label>
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="number"
                      min={1}
                      title="Max redemptions"
                      value={promoMaxUsesInput}
                      onChange={(e) =>
                        setPromoMaxUsesInput(Number(e.target.value) || 1)
                      }
                      className="w-1/2 rounded-xl border border-zinc-800 bg-[#09090B] px-2 py-2 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                    />
                    <input
                      type="number"
                      min={1}
                      title="Valid days"
                      value={promoValidDaysInput}
                      onChange={(e) =>
                        setPromoValidDaysInput(Number(e.target.value) || 30)
                      }
                      className="w-1/2 rounded-xl border border-zinc-800 bg-[#09090B] px-2 py-2 font-mono text-xs text-white outline-none focus:border-[#84CC16]"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={busyKey === "create_promo"}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-extrabold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Create Promo
                  </button>
                </div>
              </form>
            </div>

            {/* Active Promo Codes Table */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
              <h3 className="text-sm font-bold text-white">
                Active &amp; Historical Promo Codes
              </h3>

              {promoCodes.length === 0 ? (
                <p className="mt-4 text-xs text-zinc-500">
                  No promo codes created yet. Create one above to offer
                  promotional discounts or bonus tokens.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
                        <th className="py-2.5 pr-4">Code</th>
                        <th className="py-2.5 pr-4">Discount</th>
                        <th className="py-2.5 pr-4">Bonus Perks</th>
                        <th className="py-2.5 pr-4">Redemptions</th>
                        <th className="py-2.5 pr-4">Expires</th>
                        <th className="py-2.5 pr-4">Status</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {promoCodes.map((p) => (
                        <tr key={p.id} className="hover:bg-[#09090B]/60">
                          <td className="py-3 pr-4 font-mono font-extrabold text-[#A3E635]">
                            {p.code}
                          </td>
                          <td className="py-3 pr-4 font-mono text-amber-300">
                            {p.discount_percent}% OFF
                          </td>
                          <td className="py-3 pr-4 font-mono text-zinc-300">
                            +{formatCompactNumber(p.bonus_tokens)} tokens • +
                            {p.extra_workspaces} WS
                          </td>
                          <td className="py-3 pr-4 font-mono text-zinc-300">
                            {p.times_used} / {p.max_uses}
                          </td>
                          <td className="py-3 pr-4 font-mono text-zinc-400">
                            {p.expires_at
                              ? new Date(p.expires_at).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                                p.is_active
                                  ? "bg-[#84CC16]/15 text-[#A3E635]"
                                  : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {p.is_active ? "ACTIVE" : "PAUSED"}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleOrDeletePromo(p.id, "toggle")
                                }
                                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:border-[#84CC16]"
                              >
                                {p.is_active ? "Pause" : "Enable"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleOrDeletePromo(p.id, "delete")
                                }
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20"
                                title="Delete promo code"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: AGENTS & QUOTA WATCHLIST                                   */}
        {/* ================================================================= */}
        {activeTab === "governance" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Quota Watchlist &amp; Suspended Workspaces
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Workspaces above 75% monthly token consumption or currently
                    suspended by Super Admin.
                  </p>
                </div>
                <span className="rounded-full border border-zinc-800 bg-[#09090B] px-3 py-1 font-mono text-xs text-zinc-300">
                  {highUsageOrSuspendedWorkspaces.length} Flagged
                </span>
              </div>

              {highUsageOrSuspendedWorkspaces.length === 0 ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#09090B] p-4 text-xs text-zinc-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#84CC16]" />
                  <span>
                    All active workspaces are operating within healthy monthly
                    token thresholds (&lt;75% quota used).
                  </span>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {highUsageOrSuspendedWorkspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-[#09090B] p-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-white">
                            {ws.name}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              !ws.is_active
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {!ws.is_active
                              ? "SUSPENDED"
                              : `${ws.usage_percent}% USED`}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">
                          {ws.owner_email} •{" "}
                          {ws.tokens_used_this_month.toLocaleString()} /{" "}
                          {ws.monthly_token_limit.toLocaleString()} tokens
                        </p>
                      </div>

                      {!ws.is_active ? (
                        <button
                          type="button"
                          disabled={busyKey === ws.id}
                          onClick={() =>
                            handleWorkspaceDecision(
                              ws.id,
                              { action: "reactivate" },
                              `Reactivated workspace '${ws.name}'.`
                            )
                          }
                          className="shrink-0 rounded-lg bg-[#84CC16] px-3 py-1.5 text-xs font-bold text-[#09090B] hover:bg-[#A3E635]"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectTab("directory")}
                          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-[#84CC16] hover:text-[#A3E635]"
                        >
                          Add Bonus Tokens
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform-Wide Configured Agents Registry */}
            <div className="rounded-2xl border border-zinc-800/90 bg-[#121215] p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Platform-Wide Configured Agents Registry
                  </h2>
                  <p className="text-xs text-zinc-400">
                    All AI agents, LLM providers, and models deployed across
                    tenant workspaces.
                  </p>
                </div>
                <span className="rounded-full border border-[#84CC16]/35 bg-[#84CC16]/15 px-3 py-1 font-mono text-xs font-bold text-[#A3E635]">
                  {platformAgentsRegistry.length} Total Agents
                </span>
              </div>

              {platformAgentsRegistry.length === 0 ? (
                <p className="mt-4 text-xs text-zinc-500">
                  No custom agent configurations found across workspaces yet.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
                        <th className="py-2.5 pr-4">Agent Type</th>
                        <th className="py-2.5 pr-4">Provider &amp; Model</th>
                        <th className="py-2.5 pr-4">Workspace</th>
                        <th className="py-2.5 pr-4">Industry</th>
                        <th className="py-2.5">Key Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                      {platformAgentsRegistry.map((ag) => (
                        <tr key={ag.id} className="hover:bg-[#09090B]/60">
                          <td className="py-3 pr-4 font-mono font-bold text-white">
                            {ag.agent_type}
                          </td>
                          <td className="py-3 pr-4 font-mono text-zinc-300">
                            <span className="uppercase text-[#A3E635]">
                              {ag.provider}
                            </span>{" "}
                            / {ag.model_name}
                          </td>
                          <td className="py-3 pr-4 text-zinc-200">
                            {ag.workspace_name}{" "}
                            <span className="font-mono text-[11px] text-zinc-500">
                              (/{ag.workspace_slug})
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-zinc-300">
                            {formatIndustryLabel(ag.industry)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                                ag.has_custom_key
                                  ? "border border-zinc-700 bg-zinc-800 text-zinc-200"
                                  : "border border-[#84CC16]/35 bg-[#84CC16]/15 text-[#A3E635]"
                              }`}
                            >
                              {ag.has_custom_key
                                ? "BYOK Encrypted"
                                : "Managed Pool"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}