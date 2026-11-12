"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { ApiError, starElevenApi } from "@/lib/api";
import { sessionService } from "@/lib/session";
import { PlanMode } from "@/types/saas";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function RegisterPage() {
  const router = useRouter();

  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [slugEdited, setSlugEdited] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [planMode, setPlanMode] = useState<PlanMode>("managed");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleWorkspaceNameChange = (val: string) => {
    setWorkspaceName(val);
    if (!slugEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workspaceName.trim() || !slug.trim() || !email.trim() || !password) {
      setError("Please complete all required workspace fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await starElevenApi.createWorkspace({
        workspace_name: workspaceName.trim(),
        slug: toSlug(slug),
        admin_email: email.trim(),
        admin_password: password,
        admin_full_name: fullName.trim() || "Workspace Admin",
      });

      sessionService.saveSession({
        workspace_id: created.workspace_id,
        workspace_name: created.workspace_name,
        slug: created.slug,
        user_id: created.admin_user_id,
        email: created.admin_email,
        full_name: fullName.trim() || "Workspace Admin",
        plan_mode: planMode,
        logged_in_at: new Date().toISOString(),
      });

      // Route BYOK users directly to Settings Vault or Managed users to Chat
      router.push(planMode === "byok" ? "/settings" : "/chat");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to provision workspace. Ensure FastAPI server is running.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/90 p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brand/40 sm:p-8">
      {/* Top Electric Lime Shimmer */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] text-brand-glow">
          <span>MULTI-TENANT ONBOARDING</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
          Create your Workspace
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Provision an isolated Supabase tenant with LangGraph memory & agent
          routing.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-status-error/40 bg-status-error/10 p-3 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-3.5">
        {/* Dual-Mode Plan Choice: Fully Managed vs BYOK */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-300">
            Select AI Engine Mode
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPlanMode("managed")}
              className={`group relative flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-200 ${
                planMode === "managed"
                  ? "border-brand bg-brand/10 shadow-lime-sm"
                  : "border-surface-border bg-surface-bg hover:border-zinc-700"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <Sparkles
                  className={`h-4 w-4 ${
                    planMode === "managed" ? "text-brand" : "text-zinc-500"
                  }`}
                />
                {planMode === "managed" && (
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                )}
              </div>
              <span className="mt-2 text-xs font-bold text-white">
                Fully Managed
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                Zero setup. Use StarEleven hosted LLMs & tools.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPlanMode("byok")}
              className={`group relative flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-200 ${
                planMode === "byok"
                  ? "border-brand bg-brand/10 shadow-lime-sm"
                  : "border-surface-border bg-surface-bg hover:border-zinc-700"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <KeyRound
                  className={`h-4 w-4 ${
                    planMode === "byok" ? "text-brand" : "text-zinc-500"
                  }`}
                />
                {planMode === "byok" && (
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                )}
              </div>
              <span className="mt-2 text-xs font-bold text-white">
                BYOK (Custom Keys)
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-zinc-400">
                Add your own Groq, Gemini, OpenAI keys in Vault.
              </span>
            </button>
          </div>
        </div>

        {/* Agency / Company Name */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Agency / Company Name
            </label>
            <div className="group relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
              <input
                type="text"
                required
                value={workspaceName}
                onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                placeholder="Acme Growth Agency"
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-300">
              Workspace Slug
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(toSlug(e.target.value));
              }}
              placeholder="acme-growth"
              className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg px-3 font-mono text-xs text-brand-glow placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Admin Full Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Admin Full Name
          </label>
          <div className="group relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Faisal Mehmood"
              className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Admin Email */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Admin Email
          </label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="founder@agency.com"
              className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-300">
            Password
          </label>
          <div className="group relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-zinc-950 shadow-lime-glow transition-all duration-300 hover:bg-brand-glow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Provisioning Supabase Tenant...</span>
            </>
          ) : (
            <>
              <span>Launch Workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 border-t border-surface-border/80 pt-4 text-center text-xs text-zinc-400">
        Already have a workspace?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand transition-colors hover:text-brand-glow hover:underline"
        >
          Sign in →
        </Link>
      </div>
    </div>
  );
}