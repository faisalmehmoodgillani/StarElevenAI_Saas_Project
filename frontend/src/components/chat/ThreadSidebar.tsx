"use client";

import React, { useState } from "react";
import {
  MessageSquarePlus,
  Search,
  Pin,
  Trash2,
  Pencil,
  Check,
  X,
  Globe,
  Database,
  Bot,
  PanelLeftClose,
  History,
} from "lucide-react";
import { ChatThreadMeta } from "@/types/chat";

interface ThreadSidebarProps {
  threads: ChatThreadMeta[];
  activeThreadId: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  onTogglePinThread: (threadId: string) => void;
}

function MiniAgentIcon({ agent }: { agent?: string }) {
  if (agent === "research_agent") {
    return <Globe className="h-3 w-3 text-amber-400" />;
  }
  if (agent === "crm_agent") {
    return <Database className="h-3 w-3 text-[#A3E635]" />;
  }
  return <Bot className="h-3 w-3 text-zinc-400" />;
}

export function ThreadSidebar({
  threads,
  activeThreadId,
  isOpen,
  onToggle,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onRenameThread,
  onTogglePinThread,
}: ThreadSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const filteredThreads = threads
    .filter(
      (t) =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const startEditing = (e: React.MouseEvent, thread: ChatThreadMeta) => {
    e.stopPropagation();
    setEditingId(thread.id);
    setDraftTitle(thread.title);
  };

  const commitRename = (e: React.FormEvent | React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (draftTitle.trim()) {
      onRenameThread(threadId, draftTitle.trim());
    }
    setEditingId(null);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-[#27272A] bg-[#0D0D10]">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#27272A] px-3.5 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <History className="h-3.5 w-3.5 text-[#84CC16]" />
          <span>Mission Threads</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-[#18181B] hover:text-zinc-200"
          title="Collapse thread drawer"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat CTA */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNewThread}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-3.5 py-2.5 text-xs font-semibold text-zinc-950 shadow-[0_0_20px_rgba(132,204,22,0.25)] transition hover:bg-[#A3E635]"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>New Agent Session</span>
        </button>

        {/* Search Input */}
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspace threads..."
            className="w-full rounded-lg border border-[#27272A] bg-[#18181B] py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition focus:border-[#84CC16]/60"
          />
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 space-y-1 overflow-y-auto px-2.5 pb-4">
        {filteredThreads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#27272A] p-4 text-center text-xs text-zinc-500">
            No matching sessions in this workspace.
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const isEditing = editingId === thread.id;

            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`group relative cursor-pointer rounded-xl border px-3 py-2.5 transition-all ${
                  isActive
                    ? "border-[#84CC16]/45 bg-[#18181B] shadow-[0_0_18px_rgba(132,204,22,0.08)]"
                    : "border-transparent hover:border-[#27272A] hover:bg-[#18181B]/60"
                }`}
              >
                {isEditing ? (
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(e, thread.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="min-w-0 flex-1 rounded border border-[#84CC16]/50 bg-[#09090B] px-2 py-1 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => commitRename(e, thread.id)}
                      className="rounded p-1 text-[#A3E635] hover:bg-zinc-800"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {thread.pinned && (
                          <Pin className="h-3 w-3 shrink-0 text-[#84CC16]" />
                        )}
                        <p
                          className={`truncate text-xs font-medium ${
                            isActive ? "text-white" : "text-zinc-300"
                          }`}
                        >
                          {thread.title}
                        </p>
                      </div>

                      {/* Hover Quick Actions */}
                      <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePinThread(thread.id);
                          }}
                          className={`rounded p-1 transition hover:bg-zinc-800 ${
                            thread.pinned ? "text-[#A3E635]" : "text-zinc-400"
                          }`}
                          title={thread.pinned ? "Unpin" : "Pin thread"}
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => startEditing(e, thread)}
                          className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteThread(thread.id);
                          }}
                          className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-[#F43F5E]"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-1 truncate text-[11px] text-zinc-500">
                      {thread.lastMessagePreview || "Ready for instructions..."}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <MiniAgentIcon agent={thread.lastRoutedAgent} />
                        <span>
                          {thread.lastRoutedAgent
                            ? thread.lastRoutedAgent.replace("_agent", "")
                            : "auto"}
                        </span>
                      </span>
                      <span>{thread.messageCount} msgs</span>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}