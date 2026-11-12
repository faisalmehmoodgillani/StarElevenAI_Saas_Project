"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  Zap,
} from "lucide-react";
import { starElevenApi } from "@/lib/api";
import { sessionService } from "@/lib/session";
import { WorkspaceSummary } from "@/types/saas";

export default function LoginPage() {
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [email, setEmail] = useState<string>("admin@stareleven.ai");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initAuthData() {
      try {
        await starElevenApi.checkHealth();
        if (isMounted) setBackendOnline(true);

        const list = await starElevenApi.listWorkspaces();
        if (isMounted) {
          setWorkspaces(list);
          if (list.length > 0) {
            setSelectedWorkspaceId(list[0].workspace_id);
          }
        }
      } catch {
        if (isMounted) setBackendOnline(false);
      } finally {
        if (isMounted) setLoadingWorkspaces(false);
      }
    }

    initAuthData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter your workspace email and password.");
      return;
    }

    setSubmitting(true);

    try {
      const matchedWorkspace = workspaces.find(
        (w) => w.workspace_id === selectedWorkspaceId
      );

      sessionService.saveSession({
        workspace_id:
          matchedWorkspace?.workspace_id ||
          "00000000-0000-0000-0000-000000000001",
        workspace_name: matchedWorkspace?.name || "StarEleven Agency",
        slug: matchedWorkspace?.slug || "stareleven-agency",
        user_id: "00000000-0000-0000-0000-000000000002",
        email: email.trim(),
        full_name: email.split("@")[0] || "Agency Admin",
        plan_mode: "managed",
        logged_in_at: new Date().toISOString(),
      });

      router.push("/chat");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to sign in to workspace.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/90 p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brand/40 sm:p-8">
      {/* Top Electric Lime Shimmer Line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      {/* Mobile Logo Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/40 bg-brand/15">
            <Zap className="h-4 w-4 text-brand" />
          </div>
          <span className="text-base font-bold text-white">
            Star<span className="text-brand">Eleven</span>
          </span>
        </div>

        {/* Live FastAPI Status Pill */}
        <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-bg px-3 py-1 font-mono text-[11px]">
          {backendOnline === null ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-status-processing" />
              <span className="text-zinc-400">Checking API...</span>
            </>
          ) : backendOnline ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand shadow-lime-sm" />
              <span className="text-brand-glow">FastAPI Online</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-status-error" />
              <span className="text-zinc-400">Offline Sandbox</span>
            </>
          )}
        </div>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Sign in to launch your multi-agent command center.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-status-error/40 bg-status-error/10 p-3.5 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Tenant Workspace Selector (Auto-loaded from Supabase) */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-300">
            Active Tenant Workspace
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            {loadingWorkspaces ? (
              <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-xs text-zinc-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                Loading Supabase workspaces...
              </div>
            ) : workspaces.length > 0 ? (
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-sm text-zinc-100 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {workspaces.map((ws) => (
                  <option key={ws.workspace_id} value={ws.workspace_id}>
                    {ws.name} ({ws.slug})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex h-11 w-full items-center justify-between rounded-xl border border-surface-border bg-surface-bg pl-10 pr-3 text-xs text-zinc-400">
                <span>No workspace found in DB yet</span>
                <Link
                  href="/register"
                  className="font-semibold text-brand hover:underline"
                >
                  Create +
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-300">
            Work Email
          </label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-brand" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@stareleven.ai"
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand transition-colors hover:text-brand-glow hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="group relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-brand" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-11 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-colors hover:text-brand"
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Animated Electric Lime Primary Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="group relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-glow transition-all duration-300 hover:bg-brand-glow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Authenticating Workspace...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              <span>Enter Command Center</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {/* Register Footer Link */}
      <div className="mt-6 border-t border-surface-border/80 pt-5 text-center text-xs text-zinc-400">
        New client or agency workspace?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand transition-colors hover:text-brand-glow hover:underline"
        >
          Provision Workspace →
        </Link>
      </div>
    </div>
  );
}