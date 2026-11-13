"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Send,
  Square,
  Sparkles,
  Globe,
  Database,
  Mic,
  MicOff,
  Slash,
} from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  workspaceName: string;
  provider: string;
  modelName: string;
}

const SLASH_COMMANDS = [
  {
    cmd: "/research",
    label: "Deep Web Research",
    desc: "Trigger Tavily real-time search & market synthesis",
    template: "Search the web for the latest insights on ",
    icon: <Globe className="h-3.5 w-3.5 text-amber-400" />,
  },
  {
    cmd: "/crm",
    label: "Workspace CRM Audit",
    desc: "Query Supabase workspace metrics & lead pipeline",
    template: "Check my workspace summary, configured agents, and CRM status.",
    icon: <Database className="h-3.5 w-3.5 text-[#A3E635]" />,
  },
  {
    cmd: "/ops",
    label: "B2B Outreach Blueprint",
    desc: "Draft a high-converting enterprise sequence",
    template: "Create a 3-step B2B follow-up sequence for ",
    icon: <Sparkles className="h-3.5 w-3.5 text-sky-400" />,
  },
];

export function ChatComposer({
  onSend,
  onStop,
  isStreaming,
  workspaceName,
  provider,
  modelName,
}: ChatComposerProps) {
  const [input, setInput] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const handleInputChange = (val: string) => {
    setInput(val);
    setShowSlashMenu(val.trim() === "/");
  };

  const applySlashCommand = (template: string) => {
    setInput(template);
    setShowSlashMenu(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput("");
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice dictation is not supported in this browser.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="border-t border-[#27272A] bg-[#09090B]/95 px-4 py-3.5 backdrop-blur-md">
      <div className="relative mx-auto max-w-4xl">
        {/* Slash Command Popover */}
        {showSlashMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-full max-w-md rounded-2xl border border-[#27272A] bg-[#18181B] p-2 shadow-2xl">
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              Quick Agent Directives
            </div>
            {SLASH_COMMANDS.map((item) => (
              <button
                key={item.cmd}
                type="button"
                onClick={() => applySlashCommand(item.template)}
                className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-zinc-800/90"
              >
                <div className="mt-0.5 rounded-lg border border-[#27272A] bg-[#09090B] p-1.5">
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <span className="font-mono text-[#A3E635]">{item.cmd}</span>
                    <span>{item.label}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Main Input Shell */}
        <div className="rounded-2xl border border-[#27272A] bg-[#18181B] p-2.5 shadow-[0_0_30px_rgba(0,0,0,0.45)] transition-colors focus-within:border-[#84CC16]/60">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Command StarEleven multi-agent swarm... (Type / for quick directives)"
            className="max-h-44 w-full resize-none bg-transparent px-2 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />

          {/* Bottom Controls Bar */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#27272A]/80 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSlashMenu((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-[#27272A] bg-[#09090B] px-2 py-1 font-mono text-[11px] text-zinc-400 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
                title="Quick slash commands"
              >
                <Slash className="h-3 w-3 text-[#84CC16]" />
                <span>Commands</span>
              </button>

              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition ${
                  isListening
                    ? "border-[#F43F5E]/50 bg-[#F43F5E]/15 text-[#F43F5E]"
                    : "border-[#27272A] bg-[#09090B] text-zinc-400 hover:text-zinc-200"
                }`}
                title="Voice dictation"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-3 w-3 animate-pulse" />
                    <span>Listening...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3 w-3" />
                    <span>Voice</span>
                  </>
                )}
              </button>

              <span className="hidden font-mono text-[10px] text-zinc-500 sm:inline">
                Tenant: <span className="text-zinc-300">{workspaceName}</span> •{" "}
                <span className="uppercase text-[#84CC16]">{provider}</span> /{" "}
                {modelName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F43F5E]/50 bg-[#F43F5E]/15 px-3.5 py-1.5 text-xs font-semibold text-[#F43F5E] transition hover:bg-[#F43F5E]/25"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop Generating</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#84CC16] px-4 py-1.5 text-xs font-semibold text-zinc-950 shadow-[0_0_20px_rgba(132,204,22,0.25)] transition hover:bg-[#A3E635] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  <span>Execute</span>
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}