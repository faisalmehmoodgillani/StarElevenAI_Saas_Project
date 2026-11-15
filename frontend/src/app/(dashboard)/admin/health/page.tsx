"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Filter,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

interface HealthKPIs {
  total_workspaces: number;
  healthy_workspaces: number;
  client_key_warning_count: number;
  active_outages: number;
  failed_workspaces: number;
}

interface WorkspaceHealthRow {
  workspace_id: string;
  workspace_name: string;
  slug: string;
  owner_email: string;
  plan_mode: string;
  is_active: boolean;
  health_status: "healthy" | "client_warning" | "execution_failed";
  status_label: string;
  fault_attribution: string;
  configured_agents_count: number;
  has_byok_key: boolean;
  error_count_24h: number;
  latest_error_code: string | null;
  latest_error_message: string;
  latest_error_at: string | null;
}

interface SystemErrorLogItem {
  id: string;
  workspace_id: string | null;
  workspace_name: string;
  error_code: string;
  error_message: string;
  is_client_fault: boolean;
  severity: "WARNING" | "CRITICAL" | string;
  fault_attribution: string;
  created_at: string | null;
}

interface HealthOverviewResponse {
  infrastructure: {
    database: {
      ok: boolean;
      latency_ms: number | null;
      status: string;
    };
    platform_operational: boolean;
  };
  kpis: HealthKPIs;
  workspaces: WorkspaceHealthRow[];
  logs: SystemErrorLogItem[];
}

interface DiagnosticCheckItem {
  name: string;
  passed: boolean;
  detail: string;
}

interface WorkspaceDiagnosticResult {
  workspace_id: string;
  workspace_name: string;
  overall_status: "healthy" | "warning";
  latency_ms: number;
  checked_at: string;
  checks: DiagnosticCheckItem[];
}

type FaultFilterMode = "all" | "client_config" | "platform_outages";

function isSuperAdminEmail(email?: string | null): boolean {
  const configured = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "";
  if (!configured.trim() || !email || !email.trim()) return false;
  const allowed = configured
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export default function AdminHealthDiagnosticPage() {
  const router = useRouter();
  const { user } = useWorkspace();
  const adminEmail = user?.email || "";
  const authorized = isSuperAdminEmail(adminEmail);

  const [data, setData] = useState<HealthOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<FaultFilterMode>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [testingWorkspaceId, setTestingWorkspaceId] = useState<string | null>(null);
  const [activeDiagnostic, setActiveDiagnostic] =
    useState<WorkspaceDiagnosticResult | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authorized) {
      router.replace("/chat");
    }
  }, [user, authorized, router]);

  const fetchHealthOverview = useCallback(
    async (silent = false) => {
      if (!adminEmail || !authorized) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/health/overview`, {
          headers: {
            "X-Admin-Email": adminEmail,
          },
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `Failed to load diagnostics (${res.status})`);
        }
        const json: HealthOverviewResponse = await res.json();
        setData(json);
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error ? err.message : "Unable to reach observability engine."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminEmail, authorized]
  );

  useEffect(() => {
    fetchHealthOverview(false);
  }, [fetchHealthOverview]);

  const handleTestWorkspaceHealth = async (workspaceId: string) => {
    if (!adminEmail) return;
    setTestingWorkspaceId(workspaceId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/health/test-workspace/${workspaceId}`,
        {
          method: "POST",
          headers: {
            "X-Admin-Email": adminEmail,
          },
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "Health probe failed.");
      }
      const result: WorkspaceDiagnosticResult = await res.json();
      setActiveDiagnostic(result);
      await fetchHealthOverview(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to run workspace health probe."
      );
    } finally {
      setTestingWorkspaceId(null);
    }
  };

  const handleClearWorkspaceLogs = async (workspaceId: string) => {
    if (!adminEmail) return;
    setClearingId(workspaceId);
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/health/logs/${workspaceId}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Email": adminEmail,
        },
      });
      await fetchHealthOverview(true);
    } finally {
      setClearingId(null);
    }
  };

  const filteredWorkspaces = useMemo(() => {
    const list = data?.workspaces || [];
    const q = searchQuery.trim().toLowerCase();

    return list.filter((ws) => {
      if (filterMode === "client_config" && ws.health_status !== "client_warning") {
        return false;
      }
      if (filterMode === "platform_outages" && ws.health_status !== "execution_failed") {
        return false;
      }
      if (!q) return true;
      return (
        ws.workspace_name.toLowerCase().includes(q) ||
        ws.slug.toLowerCase().includes(q) ||
        ws.owner_email.toLowerCase().includes(q) ||
        (ws.latest_error_code || "").toLowerCase().includes(q)
      );
    });
  }, [data?.workspaces, filterMode, searchQuery]);

  const filteredLogs = useMemo(() => {
    const logs = data?.logs || [];
    const q = searchQuery.trim().toLowerCase();

    return logs.filter((log) => {
      if (filterMode === "client_config" && !log.is_client_fault) return false;
      if (filterMode === "platform_outages" && log.is_client_fault) return false;
      if (!q) return true;
      return (
        log.workspace_name.toLowerCase().includes(q) ||
        log.error_code.toLowerCase().includes(q) ||
        log.error_message.toLowerCase().includes(q)
      );
    });
  }, [data?.logs, filterMode, searchQuery]);

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#09090B] px-4 py-6 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#121215] via-[#131712] to-[#121215] p-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#09090B] px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-[#84CC16]/40 hover:text-[#A3E635]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Admin Console
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/35 bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#A3E635]">
                <Activity className="h-3 w-3" />
                Root Observability
              </span>
            </div>
            <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-white">
              Workspace Observability &amp; Health Diagnostic Center
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Real-time fault attribution separating{" "}
              <span className="font-semibold text-amber-300">
                Client BYOK / Config Warnings
              </span>{" "}
              from{" "}
              <span className="font-semibold text-rose-400">
                Platform Infrastructure Outages
              </span>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Platform Status Pill */}
            <div
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
                data?.infrastructure.platform_operational !== false
                  ? "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635]"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>
                {data?.infrastructure.database.ok
                  ? `Supabase DB: ${data.infrastructure.database.latency_ms}ms`
                  : "DB Probe Pending"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => fetchHealthOverview(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Telemetry
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Total Workspaces</span>
              <Sparkles className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold text-white">
              {loading ? "—" : data?.kpis.total_workspaces ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Active multi-tenant environments
            </p>
          </div>

          <div className="rounded-2xl border border-[#84CC16]/30 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300">Healthy Workspaces</span>
              <ShieldCheck className="h-4 w-4 text-[#84CC16]" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold text-[#A3E635]">
              {loading ? "—" : data?.kpis.healthy_workspaces ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-[#84CC16]/80">
              Zero execution or key faults (24h)
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/35 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-200">
                Client-Key Warning Count
              </span>
              <Wrench className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold text-amber-300">
              {loading ? "—" : data?.kpis.client_key_warning_count ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-amber-400/80">
              User Config Issue — Platform Operational
            </p>
          </div>

          <div className="rounded-2xl border border-rose-500/35 bg-[#121215] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-200">Active Outages</span>
              <ServerCrash className="h-4 w-4 text-rose-400" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold text-rose-400">
              {loading ? "—" : data?.kpis.active_outages ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-rose-400/80">
              Platform Infrastructure Errors (24h)
            </p>
          </div>
        </div>

        {/* Filter Toggle & Search Bar */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#121215] p-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <Filter className="h-3.5 w-3.5 text-[#84CC16]" />
              Fault Filter:
            </span>

            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                filterMode === "all"
                  ? "bg-[#84CC16] text-[#09090B]"
                  : "border border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-700"
              }`}
            >
              All Workspaces ({data?.workspaces.length ?? 0})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("client_config")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                filterMode === "client_config"
                  ? "border border-amber-400 bg-amber-500/20 text-amber-200"
                  : "border border-zinc-800 bg-[#09090B] text-amber-300/80 hover:border-amber-500/40"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Show Only Client Config Issues
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("platform_outages")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                filterMode === "platform_outages"
                  ? "border border-rose-400 bg-rose-500/20 text-rose-200"
                  : "border border-zinc-800 bg-[#09090B] text-rose-300/80 hover:border-rose-500/40"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Show Platform Outages
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspace, owner, error code..."
              className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
            />
          </div>
        </div>

        {/* Live On-Demand Diagnostic Result Banner */}
        {activeDiagnostic && (
          <div className="rounded-2xl border border-[#84CC16]/40 bg-[#121611] p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-[#A3E635]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Live Health Probe: {activeDiagnostic.workspace_name}
                  </h3>
                  <p className="font-mono text-[11px] text-zinc-400">
                    Completed in {activeDiagnostic.latency_ms}ms •{" "}
                    {new Date(activeDiagnostic.checked_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDiagnostic(null)}
                className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Dismiss
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {activeDiagnostic.checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3.5 ${
                    chk.passed
                      ? "border-[#84CC16]/30 bg-[#09090B]"
                      : "border-amber-500/40 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {chk.passed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#84CC16]" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    )}
                    <span className="text-xs font-bold text-white">{chk.name}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-300">
                    {chk.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspace Matrix Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                Workspace Diagnostic Matrix
              </h2>
              <p className="text-[11px] text-zinc-400">
                Per-tenant execution health, credential status, and instant probe actions
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-400">
              Showing {filteredWorkspaces.length} workspace(s)
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-xs text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin text-[#84CC16]" />
              <span>Scanning tenant health &amp; telemetry logs...</span>
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No workspaces match the active diagnostic filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#09090B]/70 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    <th className="px-5 py-3.5">Workspace Name</th>
                    <th className="px-5 py-3.5">Owner Email</th>
                    <th className="px-5 py-3.5">Active Status Badge</th>
                    <th className="px-5 py-3.5">Fault Attribution &amp; Latest Signal</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredWorkspaces.map((ws) => (
                    <tr
                      key={ws.workspace_id}
                      className="transition hover:bg-zinc-900/50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {ws.workspace_name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-zinc-500">
                          <span>/{ws.slug}</span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
                            {ws.plan_mode}
                          </span>
                          <span>• {ws.configured_agents_count} agent(s)</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-zinc-300">
                        {ws.owner_email}
                      </td>

                      <td className="px-5 py-4">
                        {ws.health_status === "healthy" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-1 font-semibold text-[#A3E635]">
                            <span className="h-2 w-2 rounded-full bg-[#84CC16]" />
                            Healthy
                          </span>
                        )}
                        {ws.health_status === "client_warning" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 font-semibold text-amber-300">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            Client Key Warning
                          </span>
                        )}
                        {ws.health_status === "execution_failed" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 font-semibold text-rose-300">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Execution Failed
                          </span>
                        )}
                      </td>

                      <td className="max-w-md px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              ws.health_status === "healthy"
                                ? "text-[#A3E635]"
                                : ws.health_status === "client_warning"
                                ? "text-amber-300"
                                : "text-rose-400"
                            }`}
                          >
                            {ws.fault_attribution}
                          </span>
                          {ws.latest_error_code && (
                            <span className="rounded border border-zinc-700 bg-[#09090B] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                              {ws.latest_error_code}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">
                          {ws.latest_error_message}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {ws.error_count_24h > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClearWorkspaceLogs(ws.workspace_id)}
                              disabled={clearingId === ws.workspace_id}
                              title="Clear resolved warning logs"
                              className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-[#09090B] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Clear ({ws.error_count_24h})
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleTestWorkspaceHealth(ws.workspace_id)}
                            disabled={testingWorkspaceId === ws.workspace_id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#84CC16]/45 bg-[#84CC16]/15 px-3 py-1.5 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B] disabled:opacity-50"
                          >
                            {testingWorkspaceId === ws.workspace_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                            Test Workspace Health
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

        {/* Classified System Error Logs Feed */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-white">
                Classified System Error Stream (`system_error_logs`)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Real-time middleware and SSE execution exceptions tagged by root cause
              </p>
            </div>
            <span className="font-mono text-xs text-zinc-400">
              {filteredLogs.length} event(s)
            </span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              No recorded exceptions under the current filter.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {filteredLogs.slice(0, 25).map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col justify-between gap-2 px-6 py-3.5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                          log.is_client_fault
                            ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                            : "border border-rose-500/40 bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {log.is_client_fault
                          ? "CLIENT CONFIG FAULT"
                          : "PLATFORM INFRASTRUCTURE"}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {log.error_code}
                      </span>
                      <span className="text-xs text-zinc-400">
                        • {log.workspace_name}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-zinc-400">
                      {log.error_message}
                    </p>
                  </div>

                  <div className="shrink-0 text-right font-mono text-[11px] text-zinc-500">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString()
                      : "Just now"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}