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
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { starElevenApi } from "@/lib/api";
import { sessionService } from "@/lib/session";
import { supabase } from "@/lib/supabase";
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

  const [step, setStep] = useState<"form" | "verify-otp">("form");
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [slugEdited, setSlugEdited] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [planMode, setPlanMode] = useState<PlanMode>("managed");
  const [otpCode, setOtpCode] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleWorkspaceNameChange = (val: string) => {
    setWorkspaceName(val);
    if (!slugEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleGoogleSignup = async () => {
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
        err instanceof Error ? err.message : "Google signup failed to start."
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || email.split("@")[0],
            workspace_name: workspaceName.trim(),
            slug: toSlug(slug),
            plan_mode: planMode,
          },
        },
      });

      if (signUpError) throw signUpError;

      // If Supabase immediately returned an active session (email confirm disabled in dashboard)
      if (data.session && data.user?.email) {
        const synced = await starElevenApi.syncUserWorkspace({
          email: data.user.email,
          full_name: fullName.trim() || data.user.email.split("@")[0],
          workspace_name: workspaceName.trim(),
          slug: toSlug(slug),
          supabase_user_id: data.user.id,
        });

        sessionService.saveSession({
          workspace_id: synced.workspace_id,
          workspace_name: synced.workspace_name,
          slug: synced.slug,
          user_id: synced.user_id,
          email: synced.email,
          full_name: synced.full_name,
          plan_mode: planMode,
          logged_in_at: new Date().toISOString(),
        });

        router.push(planMode === "byok" ? "/settings" : "/chat");
        return;
      }

      // Standard flow: Switch to 6-digit Email OTP verification screen
      setStep("verify-otp");
      setInfoMessage(
        `We sent a verification code to ${email.trim()}. Enter it below to activate your workspace.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to register account."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.trim().length < 6) {
      setError("Please enter the 6-digit verification code from your email.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "signup",
      });

      if (verifyError) throw verifyError;

      const verifiedUser = data.user;
      if (!verifiedUser || !verifiedUser.email) {
        throw new Error("Verification succeeded, please sign in to continue.");
      }

      // Now provision the isolated PostgreSQL workspace for this verified user
      const synced = await starElevenApi.syncUserWorkspace({
        email: verifiedUser.email,
        full_name: fullName.trim() || verifiedUser.email.split("@")[0],
        workspace_name: workspaceName.trim(),
        slug: toSlug(slug),
        supabase_user_id: verifiedUser.id,
      });

      sessionService.saveSession({
        workspace_id: synced.workspace_id,
        workspace_name: synced.workspace_name,
        slug: synced.slug,
        user_id: synced.user_id,
        email: synced.email,
        full_name: synced.full_name,
        plan_mode: planMode,
        logged_in_at: new Date().toISOString(),
      });

      router.push(planMode === "byok" ? "/settings" : "/chat");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid or expired verification code."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (resendError) throw resendError;
      setInfoMessage("A fresh verification code has been sent to your email.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not resend verification code."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/90 p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brand/40 sm:p-8">
      {/* Top Electric Lime Shimmer */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      {step === "form" ? (
        <>
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] text-brand-glow">
              <span>VERIFIED TENANT ONBOARDING</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Create your Workspace
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Sign up with Google or verify your work email to launch your
              agents.
            </p>
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={googleLoading || submitting}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-surface-border bg-surface-bg text-xs font-semibold text-zinc-100 transition-all hover:border-brand/50 hover:bg-surface-elevated disabled:opacity-60"
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

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-surface-border" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              or register with email
            </span>
            <div className="h-px flex-1 bg-surface-border" />
          </div>

          {error && (
            <div className="mb-3.5 flex items-start gap-2 rounded-xl border border-status-error/40 bg-status-error/10 p-3 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3">
            {/* Dual-Mode Plan Choice */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Select AI Engine Mode
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPlanMode("managed")}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                    planMode === "managed"
                      ? "border-brand bg-brand/10 shadow-lime-sm"
                      : "border-surface-border bg-surface-bg hover:border-zinc-700"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Sparkles
                      className={`h-3.5 w-3.5 ${
                        planMode === "managed" ? "text-brand" : "text-zinc-500"
                      }`}
                    />
                    {planMode === "managed" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                    )}
                  </div>
                  <span className="mt-1.5 text-xs font-bold text-white">
                    Fully Managed
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Hosted LLMs & tools included
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlanMode("byok")}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                    planMode === "byok"
                      ? "border-brand bg-brand/10 shadow-lime-sm"
                      : "border-surface-border bg-surface-bg hover:border-zinc-700"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <KeyRound
                      className={`h-3.5 w-3.5 ${
                        planMode === "byok" ? "text-brand" : "text-zinc-500"
                      }`}
                    />
                    {planMode === "byok" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                    )}
                  </div>
                  <span className="mt-1.5 text-xs font-bold text-white">
                    BYOK (Custom Keys)
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Bring Groq, Gemini, OpenAI keys
                  </span>
                </button>
              </div>
            </div>

            {/* Workspace Name + Slug */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Agency / Company Name
                </label>
                <div className="group relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                  <input
                    type="text"
                    required
                    value={workspaceName}
                    onChange={(e) => handleWorkspaceNameChange(e.target.value)}
                    placeholder="Acme Growth"
                    className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg px-3 font-mono text-xs text-brand-glow placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Full Name
              </label>
              <div className="group relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Faisal Mehmood"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Work Email
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@agency.com"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="group mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-zinc-950 shadow-lime-glow transition-all duration-300 hover:bg-brand-glow active:scale-[0.99] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Verification OTP...</span>
                </>
              ) : (
                <>
                  <span>Continue & Verify Email</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 border-t border-surface-border/80 pt-3.5 text-center text-xs text-zinc-400">
            Already have a workspace?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand hover:text-brand-glow hover:underline"
            >
              Sign in →
            </Link>
          </div>
        </>
      ) : (
        /* STEP 2: Email Verification OTP Screen */
        <div className="py-2">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand/40 bg-brand/15 text-brand shadow-lime-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Verify your Email</h2>
          {infoMessage && (
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
              {infoMessage}
            </p>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-status-error/40 bg-status-error/10 p-3 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifySignupOtp} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="h-12 w-full rounded-xl border border-surface-border bg-surface-bg px-4 text-center font-mono text-lg tracking-[0.4em] text-brand-glow placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-glow transition-all hover:bg-brand-glow disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Activating Workspace...</span>
                </>
              ) : (
                <>
                  <span>Verify & Launch Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between border-t border-surface-border/70 pt-4 text-xs">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="text-zinc-400 hover:text-white"
            >
              ← Change email
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-glow disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`}
              />
              <span>{resending ? "Sending..." : "Resend Code"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}