"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  RefreshCw,
  User,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { AgentTelemetryBadge } from "./AgentTelemetryBadge";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageBubbleProps {
  message: ChatMessage;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}

export function MessageBubble({
  message,
  isLastAssistant = false,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-2xl rounded-2xl rounded-tr-sm border border-[#84CC16]/35 bg-gradient-to-br from-[#84CC16]/20 via-[#84CC16]/10 to-[#18181B] px-4 py-3 text-sm text-zinc-100 shadow-[0_4px_24px_rgba(132,204,22,0.08)]">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <div className="mt-1.5 flex items-center justify-end gap-2 font-mono text-[10px] text-zinc-400">
            <span>{message.timestamp}</span>
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15 text-[#A3E635]">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
          message.isError
            ? "border-[#F43F5E]/50 bg-[#F43F5E]/15 text-[#F43F5E]"
            : "border-[#84CC16]/40 bg-[#18181B] text-[#A3E635] shadow-[0_0_15px_rgba(132,204,22,0.12)]"
        }`}
      >
        {message.isError ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 max-w-3xl flex-1">
        {!message.isError && (
          <AgentTelemetryBadge
            agent={message.routedAgent}
            isStreaming={message.isStreaming}
            latencyMs={message.latencyMs}
          />
        )}

        <div
          className={`rounded-2xl rounded-tl-sm border px-4 py-3.5 transition-colors ${
            message.isError
              ? "border-[#F43F5E]/40 bg-[#F43F5E]/10 text-rose-200"
              : "border-[#27272A] bg-[#18181B]/95 text-zinc-100"
          }`}
        >
          {message.content ? (
            <MarkdownRenderer
              content={message.content}
              isStreaming={message.isStreaming}
            />
          ) : (
            <div className="flex items-center gap-2 py-1 font-mono text-xs text-zinc-400">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#A3E635]" />
              <span>Synthesizing agent response...</span>
            </div>
          )}

          {/* Action Footer */}
          {!message.isStreaming && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#27272A]/80 pt-2 text-[11px] text-zinc-500">
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span>{message.timestamp}</span>
                {message.modelName && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-400">{message.modelName}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                  title="Copy response"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-[#84CC16]" />
                      <span className="text-[#A3E635]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {isLastAssistant && onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-[#A3E635]"
                    title="Regenerate response"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}