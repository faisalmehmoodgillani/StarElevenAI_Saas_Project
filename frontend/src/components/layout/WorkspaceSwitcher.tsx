"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Plus,
  Sparkles,
  KeyRound,
  X,
} from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    createWorkspace,
  } = useWorkspace();

  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNameChange = (val: string) => {
    setNewName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setNewSlug(autoSlug);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    setErrorMsg("");

    const ok = await createWorkspace(newName.trim(), newSlug.trim());
    setCreating(false);

    if (ok) {
      setNewName("");
      setNewSlug("");
      setShowCreateModal(false);
      setOpen(false);
    } else {
      setErrorMsg("Could not create workspace. Try a unique slug.");
    }
  };

  const isByok = activeWorkspace?.plan_mode?.toLowerCase() === "byok";

  return (
    <>
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between rounded-xl border border-zinc-800/90 bg-[#18181B]/90 p-2.5 text-left transition-all hover:border-[#84CC16]/50 hover:bg-zinc-900 ${
            collapsed ? "justify-center px-2" : ""
          }`}
          title={activeWorkspace?.name || "Select Workspace"}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#84CC16]/15 border border-[#84CC16]/40 text-[#A3E635]">
              <Building2 className="h-4 w-4" />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-100">
                  {activeWorkspace?.name || "Loading Workspace..."}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="truncate font-mono text-[11px] text-zinc-500">
                    /{activeWorkspace?.slug || "tenant"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${
                      isByok
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-[#84CC16]/15 text-[#A3E635] border border-[#84CC16]/30"
                    }`}
                  >
                    {isByok ? (
                      <>
                        <KeyRound className="h-2.5 w-2.5" /> BYOK
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-2.5 w-2.5" /> Managed
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
          )}
        </button>

        {/* User-Scoped Dropdown Menu */}
        {open && (
          <div className="absolute left-0 z-50 mt-2 w-64 rounded-xl border border-zinc-800 bg-[#121215] p-1.5 shadow-2xl shadow-black/80">
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Your Workspaces ({workspaces.length})
            </div>

            <div className="max-h-52 space-y-1 overflow-y-auto">
              {workspaces.map((ws, index) => {
                const isSelected = ws.id === activeWorkspace?.id;
                return (
                  <button
                    key={ws.id || ws.slug || `ws-${index}`}
                    type="button"
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-[#84CC16]/15 text-[#A3E635]"
                        : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-medium">{ws.name}</p>
                      <p className="truncate font-mono text-[11px] text-zinc-500">
                        /{ws.slug}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-[#84CC16]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="my-1.5 border-t border-zinc-800" />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowCreateModal(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#A3E635] transition-colors hover:bg-[#84CC16]/15"
            >
              <Plus className="h-4 w-4" />
              Create New Workspace
            </button>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#121215] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Create New Tenant Workspace
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Each workspace maintains isolated agents, knowledge vectors, CRM
              leads, and encrypted API keys.
            </p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Agency / Company Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. StarEleven Enterprise"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300">
                  Workspace Slug
                </label>
                <input
                  type="text"
                  required
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="stareleven-enterprise"
                  className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-sm text-[#A3E635] placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-medium text-red-400">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-[#84CC16] px-4 py-2 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635] disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}