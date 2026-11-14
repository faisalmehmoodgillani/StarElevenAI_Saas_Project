"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserEmail() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (data?.user?.email) {
          setUserEmail(data.user.email);
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          if (isMounted) {
            setUserEmail(sessionData?.session?.user?.email ?? null);
          }
        }
      } catch {
        if (isMounted) setUserEmail(null);
      } finally {
        if (isMounted) setLoadingUser(false);
      }
    }

    fetchUserEmail();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStrengthLevel = (pwd: string): number => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = getStrengthLevel(newPassword);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMsg("Password updated successfully. Redirecting to Settings...");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        router.push("/settings");
      }, 1400);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update password.";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto transition-all duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#121215]/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-7">
        {/* Top Electric Lime Ambient Beam */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#84CC16] to-transparent opacity-90" />
        <div className="pointer-events-none absolute -top-20 left-1/2 h-36 w-64 -translate-x-1/2 rounded-full bg-[#84CC16]/10 blur-3xl animate-pulse" />

        {/* Back to Settings Navigation */}
        <div className="relative flex items-center">
          <Link
            href="/settings"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors duration-200 hover:text-[#A3E635]"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>Back to Settings</span>
          </Link>
        </div>

        {/* Icon & Heading */}
        <div className="relative mt-4">
          <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#84CC16] shadow-[0_0_24px_rgba(132,204,22,0.2)] transition-transform duration-300 hover:scale-105">
            <KeyRound className="h-5 w-5" />
          </div>

          <h1 className="mt-3.5 text-2xl font-bold tracking-tight text-white">
            Change Password
          </h1>

          <p className="mt-1 text-xs text-zinc-400">
            {loadingUser ? (
              "Verifying active account..."
            ) : userEmail ? (
              <>
                Updating Supabase Auth password for{" "}
                <span className="font-medium text-zinc-200">{userEmail}</span>
              </>
            ) : (
              "Updating password for your active account"
            )}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 transition-all duration-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/10 px-3 py-2 text-xs text-[#A3E635] transition-all duration-200">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#84CC16]" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Password Update Form */}
        <form onSubmit={handleUpdatePassword} className="mt-5 space-y-3.5">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200">
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
              >
                {showNew ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors" />
              <input
                type={showNew ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 transition-all duration-200 focus:border-[#84CC16] focus:shadow-[0_0_0_3px_rgba(132,204,22,0.12)] focus:outline-none"
              />
            </div>

            {/* Animated Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength >= level
                        ? strength <= 1
                          ? "bg-rose-500"
                          : strength === 2
                          ? "bg-amber-400"
                          : "bg-[#84CC16]"
                        : "bg-zinc-800"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200">
                Confirm New Password
              </label>
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200"
              >
                {showConfirm ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors" />
              <input
                type={showConfirm ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 transition-all duration-200 focus:border-[#84CC16] focus:shadow-[0_0_0_3px_rgba(132,204,22,0.12)] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || loadingUser}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-4 py-2.5 text-sm font-bold text-[#09090B] shadow-[0_0_24px_rgba(132,204,22,0.25)] transition-all duration-200 hover:bg-[#A3E635] hover:shadow-[0_0_30px_rgba(163,230,53,0.4)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Password...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}