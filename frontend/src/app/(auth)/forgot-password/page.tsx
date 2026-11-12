"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type RecoveryStep = "request" | "verify" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<RecoveryStep>("request");
  const [email, setEmail] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your registered workspace email.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim()
      );
      if (resetError) throw resetError;
      setStep("verify");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send password recovery email."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpCode.trim().length < 6) {
      setError("Please enter the 6-digit recovery code from your email.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "recovery",
      });
      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setStep("done");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid recovery code or unable to update password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/90 p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brand/40 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Login</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-6 rounded-full ${
              step === "request" ? "bg-brand shadow-lime-sm" : "bg-brand/40"
            }`}
          />
          <span
            className={`h-2 w-6 rounded-full ${
              step === "verify"
                ? "bg-brand shadow-lime-sm"
                : step === "done"
                ? "bg-brand/40"
                : "bg-surface-border"
            }`}
          />
          <span
            className={`h-2 w-6 rounded-full ${
              step === "done" ? "bg-brand shadow-lime-sm" : "bg-surface-border"
            }`}
          />
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-status-error/40 bg-status-error/10 p-3.5 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
          <span>{error}</span>
        </div>
      )}

      {step === "request" && (
        <>
          <div className="mb-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Reset your password
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Enter your registered work email and Supabase Auth will dispatch a
              6-digit OTP recovery code to your inbox.
            </p>
          </div>

          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                Registered Work Email
              </label>
              <div className="group relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@agency.com"
                  className="h-11 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-glow transition-all hover:bg-brand-glow disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending OTP to Email...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery OTP</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </>
      )}

      {step === "verify" && (
        <>
          <div className="mb-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] text-brand-glow">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" />
              <span>OTP SENT TO {email.toUpperCase()}</span>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
              Verify OTP & Set Password
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Check your email inbox (or spam folder) for the 6-digit recovery
              code.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                6-Digit Recovery OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-bg px-4 text-center font-mono text-base tracking-[0.35em] text-brand-glow placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                New Password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="h-11 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-11 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-brand"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Confirm New Password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-11 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-glow transition-all hover:bg-brand-glow disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying & Updating...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </>
      )}

      {step === "done" && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand shadow-lime-glow">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-white">
            Password Reset Complete
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Your Supabase Auth password for{" "}
            <span className="font-semibold text-zinc-200">{email}</span> has
            been updated.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-glow transition-all hover:bg-brand-glow"
          >
            <span>Return to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}