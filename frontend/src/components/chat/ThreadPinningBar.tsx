"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Pin,
  Bot,
  Wrench,
  Plus,
  X,
  Check,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { WorkspaceAgentItem, WorkspaceConnector } from "@/types/agents";

interface ThreadPinningBarProps {
  agents: WorkspaceAgentItem[];
  connectors: WorkspaceConnector[];
  pinnedAgentIds: string[];
  pinnedToolIds: string[];
  onToggleAgent: (agentId: string) => void;
  onToggleTool: (connectorId: string) => void;
  onClearAll: () => void;
}

export function ThreadPinningBar({
  agents,
  connectors,
  pinnedAgentIds,
  pinnedToolIds,
  onToggleAgent,
  onToggleTool,
  onClearAll,
}: ThreadPinningBarProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const activeAgents = agents.filter((a) => a.is_active);
  const connectedTools = connectors.filter((c) => c.is_connected);

  const pinnedAgentsList = activeAgents.filter((a) =>
    pinnedAgentIds.includes(a.id)
  );
  const pinnedToolsList = connectedTools.filter((c) =>
    pinnedToolIds.includes(c.connector_id)
  );

  const totalPinned = pinnedAgentsList.length + pinnedToolsList.length;

  return (
    <div className="relative border-b border-[#27272A] bg-[#0B0B0E] px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Active Thread Scope Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <Pin className="h-3 w-3 text-[#84CC16]" />
            <span>Thread Scope:</span>
          </span>

          {totalPinned === 0 ? (
            <span className="rounded-full border border-zinc-800 bg-[#18181B] px-2.5 py-0.5 font-mono text-[10px] text-zinc-400">
              Blank-Slate Copilot (0 agents/tools pinned)
            </span>
          ) : (
            <>
              {pinnedAgentsList.map((ag) => (
                <span
                  key={ag.id}
                  className="inline-flex items-center gap-1 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#A3E635]"
                >
                  <Bot className="h-3 w-3" />
                  <span>{ag.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleAgent(ag.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-[#84CC16]/25"
                    title="Unpin agent"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}

              {pinnedToolsList.map((tool) => (
                <span
                  key={tool.connector_id}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] text-amber-300"
                >
                  <Wrench className="h-2.5 w-2.5" />
                  <span>{tool.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleTool(tool.connector_id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-amber-500/20"
                    title="Unpin tool"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </>
          )}
        </div>

        {/* Right: Pin Selector Button */}
        <div className="flex items-center gap-2">
          {totalPinned > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="font-mono text-[10px] text-zinc-500 transition hover:text-zinc-300"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              isPickerOpen
                ? "border-[#84CC16] bg-[#84CC16] text-[#09090B]"
                : "border-zinc-800 bg-[#18181B] text-zinc-200 hover:border-[#84CC16]/50 hover:text-[#A3E635]"
            }`}
          >
            <Plus className="h-3 w-3" />
            <span>Pin Agents / Tools</span>
          </button>
        </div>
      </div>

      {/* Dropdown Popover */}
      {isPickerOpen && (
        <div className="mt-2.5 rounded-2xl border border-zinc-800 bg-[#121215] p-4 shadow-2xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Workspace Agents Column */}
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Bot className="h-3.5 w-3.5 text-[#84CC16]" />
                  Workspace Agents ({activeAgents.length})
                </span>
                <Link
                  href="/agents"
                  className="inline-flex items-center gap-0.5 font-mono text-[10px] text-[#A3E635] hover:underline"
                >
                  Agent Studio <ArrowUpRight className="h-2.5 w-2.5" />
                </Link>
              </div>

              {activeAgents.length === 0 ? (
                <div className="mt-2 rounded-xl border border-dashed border-zinc-800 bg-[#09090B] p-3 text-[11px] text-zinc-400">
                  No custom agents deployed yet.{" "}
                  <Link
                    href="/agents?tab=skills"
                    className="font-semibold text-[#A3E635] underline"
                  >
                    Deploy an Industry Skill →
                  </Link>
                </div>
              ) : (
                <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {activeAgents.map((ag) => {
                    const checked = pinnedAgentIds.includes(ag.id);
                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => onToggleAgent(ag.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                          checked
                            ? "border-[#84CC16]/60 bg-[#84CC16]/15 text-white"
                            : "border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-700"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{ag.name}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {ag.role_title}
                          </p>
                        </div>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "border-[#84CC16] bg-[#84CC16] text-[#09090B]"
                              : "border-zinc-700"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Connected Tools Column */}
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Connected Tools ({connectedTools.length})
                </span>
                <Link
                  href="/agents?tab=connectors"
                  className="inline-flex items-center gap-0.5 font-mono text-[10px] text-[#A3E635] hover:underline"
                >
                  Manage Tools <ArrowUpRight className="h-2.5 w-2.5" />
                </Link>
              </div>

              <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {connectedTools.map((tool) => {
                  const checked = pinnedToolIds.includes(tool.connector_id);
                  return (
                    <button
                      key={tool.connector_id}
                      type="button"
                      onClick={() => onToggleTool(tool.connector_id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                        checked
                          ? "border-amber-500/60 bg-amber-500/12 text-white"
                          : "border-zinc-800 bg-[#09090B] text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{tool.name}</p>
                        <p className="truncate font-mono text-[10px] text-zinc-500">
                          {tool.category}
                        </p>
                      </div>
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-amber-400 bg-amber-400 text-[#09090B]"
                            : "border-zinc-700"
                        }`}
                      >
                        {checked && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end border-t border-zinc-800 pt-2.5">
            <button
              type="button"
              onClick={() => setIsPickerOpen(false)}
              className="rounded-lg bg-[#84CC16] px-3.5 py-1 text-xs font-bold text-[#09090B] hover:bg-[#A3E635]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}