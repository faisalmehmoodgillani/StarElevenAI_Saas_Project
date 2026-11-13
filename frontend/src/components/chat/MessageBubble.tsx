"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  RefreshCw,
  User,
  Zap,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { ChatMessage } from "@/types/chat";
import { AgentTelemetryBadge } from "./AgentTelemetryBadge";

interface MessageBubbleProps {
  message: ChatMessage;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#27272A] bg-[#09090B]">
      <div className="flex items-center justify-between border-b border-[#27272A] bg-zinc-900/90 px-3.5 py-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          <Terminal className="h-3.5 w-3.5 text-[#84CC16]" />
          <span>{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1 rounded-md border border-[#27272A] bg-[#18181B] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#84CC16]" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="rounded border border-[#27272A] bg-[#09090B] px-1.5 py-0.5 font-mono text-[12px] text-[#A3E635]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-zinc-200">
      {segments.map((segment, index) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const lines = segment.slice(3, -3).split("\n");
          const firstLine = lines[0]?.trim() || "";
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const lang = hasLang ? firstLine : "text";
          const codeBody = (hasLang ? lines.slice(1) : lines).join("\n").trim();
          return <CodeBlock key={index} language={lang} code={codeBody} />;
        }

        const paragraphs = segment.split("\n");
        return (
          <div key={index} className="space-y-1.5">
            {paragraphs.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;

              if (trimmed.startsWith("### ")) {
                return (
                  <h4
                    key={lineIdx}
                    className="pt-2 text-sm font-semibold text-[#A3E635]"
                  >
                    {renderInlineFormatting(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3
                    key={lineIdx}
                    className="pt-2 text-base font-bold text-white"
                  >
                    {renderInlineFormatting(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#84CC16]" />
                    <span>{renderInlineFormatting(trimmed.slice(2))}</span>
                  </div>
                );
              }

              return (
                <p key={lineIdx} className="whitespace-pre-wrap">
                  {renderInlineFormatting(line)}
                </p>
              );
            })}
          </div>
        );
      })}

      {isStreaming && (
        <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-xs bg-[#A3E635] align-middle shadow-[0_0_10px_#84CC16]" />
      )}
    </div>
  );
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
          <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px] font-mono text-zinc-400">
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

      <div className="min-w-0 flex-1 max-w-3xl">
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
            <FormattedContent
              content={message.content}
              isStreaming={message.isStreaming}
            />
          ) : (
            <div className="flex items-center gap-2 py-1 text-xs font-mono text-zinc-400">
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