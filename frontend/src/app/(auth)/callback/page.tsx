"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { starElevenApi } from "@/lib/api";
import { sessionService } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function completeOAuthLogin() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = data.session?.user;
        if (!user || !user.email) {
          throw new Error(
            "Google sign-in session could not be verified. Please try again."
          );
        }

        const fullName =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          user.email.split("@")[0];

        const synced = await starElevenApi.syncUserWorkspace({
          email: user.email,
          full_name: fullName,
          supabase_user_id: user.id,
        });

        if (!active) return;

        sessionService.saveSession({
          workspace_id: synced.workspace_id,
          workspace_name: synced.workspace_name,
          slug: synced.slug,
          user_id: synced.user_id,
          email: synced.email,
          full_name: synced.full_name,
          plan_mode: "managed",
          logged_in_at: new Date().toISOString(),
        });

        router.replace("/chat");
      } catch (err: unknown) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to complete Google authentication."
        );
      }
    }

    completeOAuthLogin();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/90 p-8 text-center shadow-2xl backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent" />

      {error ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-status-error/40 bg-status-error/10 text-status-error">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Authentication Incomplete
          </h2>
          <p className="text-xs text-rose-200">{error}</p>
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand text-xs font-semibold text-zinc-950 hover:bg-brand-glow"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <div className="space-y-3 py-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-brand/40 bg-brand/15 text-brand shadow-lime-sm">
            <ShieldCheck className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Syncing Google Workspace...
          </h2>
          <p className="flex items-center justify-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
            <span>Provisioning isolated tenant environment</span>
          </p>
        </div>
      )}
    </div>
  );
}