"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { sessionService, StarElevenSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
} {
  if (!password) return { score: 0, label: "Empty" };
  let score = 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ["Empty", "Weak", "Fair", "Strong", "Enterprise"];
  return { score, label: labels[score] };
}

export default function ChangePasswordPage() {
  const [session, setSession] = useState<StarElevenSession | null>(null);
  const [checkedSession, setCheckedSession] = useState<boolean>(false);

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPasswords, setShowPasswords] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    setSession(sessionService.getSession());
    setCheckedSession(true);
  }, []);

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!session) {
      setError("You must be signed in to change your password.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update Supabase Auth password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!checkedSession) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-surface-border bg-surface-card/90 p-10">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/90 p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-brand/40 sm:p-8">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      <div className="mb-5 flex items-center justify-between">
        <Link
          href={session ? "/chat" : "/login"}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{session ? "Back to Dashboard" : "Back to Login"}</span>
        </Link>

        {session && (
          <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-mono text-[11px] text-brand-glow">
            {session.slug}
          </span>
        )}
      </div>

      <div className="mb-5">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
          <KeyRound className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Change Password
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          {session
            ? `Updating Supabase Auth password for ${session.email}`
            : "Authentication required to update workspace credentials."}
        </p>
      </div>

      {!session ? (
        <div className="rounded-xl border border-status-processing/40 bg-status-processing/10 p-4 text-xs text-amber-200">
          <p className="font-semibold text-white">No Active Session Found</p>
          <p className="mt-1 leading-relaxed text-zinc-300">
            Please sign in to your workspace first before updating your password.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-sm hover:bg-brand-glow"
          >
            Go to Sign In
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-status-error/40 bg-status-error/10 p-3 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand/40 bg-brand/10 p-3.5 text-xs text-brand-glow">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="font-semibold text-white">
                  Password Updated Successfully
                </p>
                <p className="mt-0.5 text-zinc-300">
                  Your new password is live in Supabase Auth for{" "}
                  {session.workspace_name}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-brand"
                >
                  {showPasswords ? (
                    <>
                      <EyeOff className="h-3 w-3" /> Hide
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" /> Show
                    </>
                  )}
                </button>
              </div>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type={showPasswords ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              {newPassword.length > 0 && (
                <div className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          strength.score >= level
                            ? "bg-brand shadow-lime-sm"
                            : "bg-surface-border"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-right font-mono text-[10px] text-zinc-400">
                    Strength:{" "}
                    <span className="text-brand-glow">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-300">
                Confirm New Password
              </label>
              <div className="group relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand" />
                <input
                  type={showPasswords ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-10 w-full rounded-xl border border-surface-border bg-surface-bg pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-zinc-950 shadow-lime-glow transition-all hover:bg-brand-glow disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}