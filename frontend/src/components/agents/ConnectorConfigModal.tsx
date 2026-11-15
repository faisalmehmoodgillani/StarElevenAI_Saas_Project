"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  KeyRound,
  Server,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { WorkspaceConnector } from "@/types/agents";

interface ConnectorConfigModalProps {
  connector: WorkspaceConnector | null;
  workspaceId: string;
  apiBaseUrl: string;
  onClose: () => void;
  onConnected: (connectorId: string) => void;
}

export function ConnectorConfigModal({
  connector,
  workspaceId,
  apiBaseUrl,
  onClose,
  onConnected,
}: ConnectorConfigModalProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [customName, setCustomName] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!connector) return;
    const initial: Record<string, string> = {};
    for (const field of connector.fields || []) {
      if (field.key === "mcp_url" && connector.mcp_url) {
        initial[field.key] = connector.mcp_url;
      } else {
        initial[field.key] = "";
      }
    }
    setFormValues(initial);
    setCustomName(connector.name);
    setShowSecrets({});
    setErrorMsg(null);
  }, [connector]);

  if (!connector) return null;

  const isMcp = connector.auth_type === "mcp_remote";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/connectors/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          connector_id: connector.connector_id,
          custom_name: isMcp ? customName.trim() || connector.name : undefined,
          credentials: formValues,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Failed to connect integration.");
      }

      onConnected(connector.connector_id);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Could not save connector."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
              {isMcp ? (
                <Server className="h-5 w-5" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#A3E635]">
                {connector.category}
              </span>
              <h3 className="text-base font-bold text-white">
                Configure {connector.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-xs leading-relaxed text-zinc-400">
            {connector.description}
          </p>

          {isMcp && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                MCP Server Label
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. HubSpot & Notion MCP Bridge"
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
              />
            </div>
          )}

          {connector.fields.map((field) => {
            const isHidden = field.secret && !showSecrets[field.key];
            const isRequired =
              !field.placeholder.toLowerCase().includes("optional") &&
              !field.placeholder.toLowerCase().includes("leave blank");

            return (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-zinc-300">
                  {field.label}
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={isHidden ? "password" : "text"}
                    required={isRequired}
                    value={formValues[field.key] || ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 pr-10 font-mono text-xs text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                  />
                  {field.secret && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowSecrets((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {isHidden ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 rounded-xl border border-[#84CC16]/25 bg-[#84CC16]/10 px-3.5 py-2.5 text-[11px] text-[#A3E635]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#84CC16]" />
            <span>
              Encrypted with AES-256 at rest and isolated strictly to this
              workspace.
            </span>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-5 py-2 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Encrypting &amp; Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save &amp; Connect
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}