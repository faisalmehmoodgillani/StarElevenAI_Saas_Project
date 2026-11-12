"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
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
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    starElevenApi
      .checkHealth()
      .then(() => mounted && setBackendOnline(true))
      .catch(() => mounted && setBackendOnline(false));
    return () => {
      mounted = false;
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      setGoogleLoading(false);
      setError(
        err instanceof Error ? err.message : "Google sign-in failed to start."
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your workspace email and password.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("email not confirmed")) {
          throw new Error(
            "Your email is not verified yet. Please check your inbox for the verification code."
          );
        }
        throw authError;
      }

      const authUser = data.user;
      if (!authUser || !authUser.email) {
        throw new Error("Authentication succeeded but user profile is missing.");
      }

      // Sync & retrieve ONLY this authenticated user's tenant workspace
      const synced = await starElevenApi.syncUserWorkspace({
        email: authUser.email,
        full_name:
          (authUser.user_metadata?.full_name as string) ||
          authUser.email.split("@")[0],
        workspace_name: authUser.user_metadata?.workspace_name as string,
        slug: authUser.user_metadata?.slug as string,
        supabase_user_id: authUser.id,
      });

      const savedPlanMode =
        (authUser.user_metadata?.plan_mode as "managed" | "byok") || "managed";

      sessionService.saveSession({
        workspace_id: synced.workspace_id,
        workspace_name: synced.workspace_name,
        slug: synced.slug,
        user_id: synced.user_id,
        email: synced.email,
        full_name: synced.full_name,
        plan_mode: savedPlanMode,
        logged_in_at: new Date().toISOString(),
      });

      router.push("/chat");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/90 p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brand/40 sm:p-8">
      {/* Top Electric Lime Shimmer Line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      {/* Header + Live API Status */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/40 bg-brand/15">
            <Zap className="h-4 w-4 text-brand" />
          </div>
          <span className="text-base font-bold text-white">
            Star<span className="text-brand">Eleven</span>
          </span>
        </div>

        <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-bg px-3 py-1 font-mono text-[11px]">
          {backendOnline === null ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-status-processing" />
              <span className="text-zinc-400">Checking API...</span>
            </>
          ) : backendOnline ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand shadow-lime-sm" />
              <span className="text-brand-glow">System Online</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-status-error" />
              <span className="text-zinc-400">Backend Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Heading */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Sign in to access your isolated AI agent workspace.
        </p>
      </div>

      {/* Continue with Google Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || submitting}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-surface-border bg-surface-bg text-sm font-medium text-zinc-100 transition-all duration-200 hover:border-brand/50 hover:bg-surface-elevated disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.1 7.4 24 12 24z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-surface-border" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
          or with work email
        </span>
        <div className="h-px flex-1 bg-surface-border" />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-status-error/40 bg-status-error/10 p-3.5 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
          <span>{error}</span>
        </div>
      )}

      {/* Email + Password Form */}
      <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="founder@agency.com"
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

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
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || googleLoading}
          className="group relative mt-2 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-glow transition-all duration-300 hover:bg-brand-glow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              <span>Sign In to Workspace</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-surface-border/80 pt-5 text-center text-xs text-zinc-400">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand transition-colors hover:text-brand-glow hover:underline"
        >
          Create Workspace →
        </Link>
      </div>
    </div>
  );
}