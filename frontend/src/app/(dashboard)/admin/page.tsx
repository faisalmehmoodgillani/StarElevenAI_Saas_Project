"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  KeyRound,
  Loader2,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

interface AdminWorkspaceRow {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  plan_mode: string;
  managed_approved: boolean;
  managed_request_status: string;
  created_at: string | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ""
).toLowerCase();

export default function SuperAdminApprovalsPage() {
  const { userEmail, user, refreshWorkspaces } = useWorkspace();
  const currentEmail = (userEmail || user?.email || "").toLowerCase();

  const isSuperAdmin =
    !SUPER_ADMIN_EMAIL || currentEmail === SUPER_ADMIN_EMAIL;

  const [rows, setRows] = useState<AdminWorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    if (!currentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/admin/overview`,
        {
          headers: { "X-Admin-Email": currentEmail },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRows(data.workspaces || []);
      }
    } finally {
      setLoading(false);
    }
  }, [currentEmail]);

  useEffect(() => {
    if (isSuperAdmin && currentEmail) {
      loadWorkspaces();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, currentEmail, loadWorkspaces]);

  const handleDecision = async (
    workspaceId: string,
    decision: "approve" | "reject"
  ) => {
    setActionId(workspaceId);
    setBanner(null);
    try {
      const endpoint =
        decision === "approve" ? "approve-managed" : "reject-managed";
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}/${endpoint}`,
        {
          method: "POST",
          headers: { "X-Admin-Email": currentEmail },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Action failed.");
      }

      await loadWorkspaces();
      await refreshWorkspaces();
      setBanner(
        decision === "approve"
          ? "Workspace approved & switched to Fully Managed Plan!"
          : "Managed Plan access revoked — workspace set to BYOK."
      );
    } catch (err: unknown) {
      setBanner(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setActionId(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-12 w-12 text-rose-400" />
        <h1 className="mt-4 text-lg font-bold text-white">
          Super-Admin Access Only
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          This approval console is restricted to StarEleven platform
          administrators.
        </p>
        <Link
          href="/settings"
          className="mt-5 rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-bold text-[#09090B]"
        >
          Return to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#121215] p-6 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#A3E635]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
          </Link>
          <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            Managed Plan Approvals Console
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Review client requests for StarEleven Fully Managed AI Cloud and
            approve or revoke access with 1 click.
          </p>
        </div>

        <button
          type="button"
          onClick={loadWorkspaces}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-[#84CC16]/50 sm:self-center"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh List
        </button>
      </div>

      {banner && (
        <div className="rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/10 px-4 py-3 text-xs font-medium text-[#A3E635]">
          {banner}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215]">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-xs text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#84CC16]" />
            Loading client workspaces...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-[#09090B] font-mono text-[11px] uppercase text-zinc-400">
                <tr>
                  <th className="px-5 py-3.5">Client Workspace</th>
                  <th className="px-5 py-3.5">Owner Email</th>
                  <th className="px-5 py-3.5">Current Mode</th>
                  <th className="px-5 py-3.5">Approval Status</th>
                  <th className="px-5 py-3.5 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {rows.map((w) => {
                  const isPending = w.managed_request_status === "pending";
                  const isBusy = actionId === w.id;

                  return (
                    <tr key={w.id} className="hover:bg-zinc-900/40">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{w.name}</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          /{w.slug}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-mono text-zinc-300">
                        {w.owner_email}
                      </td>
                      <td className="px-5 py-4">
                        {w.plan_mode === "managed" && w.managed_approved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#84CC16]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                            <Sparkles className="h-3 w-3" /> MANAGED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
                            <KeyRound className="h-3 w-3" /> BYOK
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                            <Clock className="h-3 w-3" /> PENDING APPROVAL
                          </span>
                        ) : w.managed_approved ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#A3E635]">
                            <CheckCircle2 className="h-3 w-3" /> APPROVED
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] text-zinc-500">
                            Not Requested
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {!w.managed_approved && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDecision(w.id, "approve")}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#84CC16] px-3 py-1.5 text-[11px] font-bold text-[#09090B] hover:bg-[#A3E635] disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Approve
                            </button>
                          )}

                          {(w.managed_approved || isPending) && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDecision(w.id, "reject")}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {w.managed_approved ? "Revoke" : "Decline"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}