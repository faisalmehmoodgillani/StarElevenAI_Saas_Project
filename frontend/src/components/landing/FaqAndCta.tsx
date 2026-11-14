"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  HelpCircle,
  Mail,
  Sparkles,
  Zap,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Do I need technical or coding skills to use StarEleven AI?",
    answer:
      "Not at all. If you choose any Managed plan, everything is pre-configured out of the box — just pick your business industry, invite your team, and start chatting or qualifying leads right away. If you are technical and want to plug in your own API keys at $0/mo, our BYOK Free tier is ready for you too.",
  },
  {
    question:
      "What is the difference between 'BYOK Free ($0/mo)' and 'Managed Plans'?",
    answer:
      "With BYOK Free ($0/mo), you bring your own API key from Groq, Google Gemini, OpenAI, Claude, or OpenRouter and pay those providers directly with zero platform fee. With Managed Plans (Starter, Growth, Agency), you don't need any external API accounts — we provide a ready-to-use monthly AI usage pool and master keys so you can start in 60 seconds.",
  },
  {
    question:
      "If I manage multiple clients, is each client's data kept completely private?",
    answer:
      "Yes, 100%. Every client gets their own isolated workspace with separate chat history, lead records, and encrypted credentials. Client A's data can never be seen by Client B (enforced at the database level via PostgreSQL Row-Level Security).",
  },
  {
    question:
      "Can I add my staff or virtual assistants without showing them my billing or API keys?",
    answer:
      "Yes. You can invite team members as 'Operators'. Operators can use the AI chat, research tools, and CRM leads every day, while your billing settings and encrypted API keys stay completely hidden and locked to the Workspace Owner.",
  },
  {
    question: "Can I book a live demo call before choosing a plan?",
    answer:
      "Of course! Click 'Book a Call' anywhere on this page or email us at hello@starelevenai.com to schedule a 1-on-1 walkthrough tailored to your business or agency.",
  },
];

interface FaqAndCtaProps {
  onOpenBookCall: () => void;
}

export function FaqAndCta({ onOpenBookCall }: FaqAndCtaProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <>
      {/* FAQ Section */}
      <section
        id="faq"
        className="border-b border-zinc-800/80 bg-[#09090B] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121215] px-3.5 py-1 text-xs font-semibold text-[#A3E635]">
              <HelpCircle className="h-3.5 w-3.5 text-[#84CC16]" />
              <span>Common Questions</span>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Clear Answers Before You Get Started
            </h2>
          </div>

          <div className="mt-10 space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={item.question}
                  className={`overflow-hidden rounded-2xl border transition-colors ${
                    isOpen
                      ? "border-[#84CC16]/50 bg-[#121215]"
                      : "border-zinc-800 bg-[#121215]/70 hover:border-zinc-700"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                  >
                    <span className="text-sm font-bold text-zinc-100">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#84CC16] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-zinc-800/80 px-5 py-4 text-xs leading-relaxed text-zinc-300 sm:px-6 sm:text-sm">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Conversion & Strategy Call Banner */}
      <section className="relative overflow-hidden bg-[#09090B] py-20 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#84CC16]/15 blur-[140px]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-[#84CC16]/40 bg-gradient-to-br from-[#141910] via-[#121215] to-[#0D0D10] p-8 text-center shadow-[0_0_50px_rgba(132,204,22,0.14)] sm:p-12">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3.5 py-1 text-xs font-bold text-[#A3E635]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>START FREE OR TALK TO OUR TEAM</span>
            </div>

            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to Launch Your Private AI Workforce?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              Create your workspace in 60 seconds with our $0/mo Free plan, or
              book a 1-on-1 call and let us walk you through the best setup for
              your business.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/register?plan=byok_free&interval=annual"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#84CC16] px-7 py-3.5 text-sm font-bold text-[#09090B] shadow-[0_0_30px_rgba(132,204,22,0.3)] transition hover:bg-[#A3E635] sm:w-auto"
              >
                <span>Create Free Workspace</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                type="button"
                onClick={onOpenBookCall}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-[#09090B] px-7 py-3.5 text-sm font-semibold text-white transition hover:border-[#84CC16]/60 hover:text-[#A3E635] sm:w-auto"
              >
                <Calendar className="h-4 w-4 text-[#84CC16]" />
                <span>Book a Strategy Call</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Footer with Social Media Icons & Direct Email */}
      <footer className="border-t border-zinc-800/90 bg-[#09090B] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            {/* Left: Brand & Contact Email */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/15">
                  <Zap className="h-4 w-4 text-[#84CC16]" />
                </div>
                <span className="text-base font-extrabold text-white">
                  Star<span className="text-[#84CC16]">Eleven</span> AI
                </span>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
                Multi-tenant AI workforce platform built for modern agencies and
                growing businesses.
              </p>
              <a
                href="mailto:hello@starelevenai.com"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#A3E635] hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>hello@starelevenai.com</span>
              </a>
            </div>

            {/* Center: Navigation Links */}
            <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-zinc-400">
              <a href="#top" className="hover:text-[#A3E635]">
                Home
              </a>
              <a href="#platform" className="hover:text-[#A3E635]">
                Benefits
              </a>
              <a href="#comparison" className="hover:text-[#A3E635]">
                Why Us
              </a>
              <a href="#industries" className="hover:text-[#A3E635]">
                Industries
              </a>
              <a href="#pricing" className="hover:text-[#A3E635]">
                Pricing
              </a>
              <button
                type="button"
                onClick={onOpenBookCall}
                className="hover:text-[#A3E635]"
              >
                Book a Call
              </button>
              <Link href="/login" className="hover:text-[#A3E635]">
                Sign In
              </Link>
            </div>

            {/* Right: Official Social Media Icons */}
            <div className="flex items-center gap-3">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/starelevenai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StarEleven AI on Facebook"
                title="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] text-zinc-300 transition hover:border-[#84CC16]/60 hover:bg-[#84CC16]/15 hover:text-[#A3E635]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/starelevenai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StarEleven AI on Instagram"
                title="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] text-zinc-300 transition hover:border-[#84CC16]/60 hover:bg-[#84CC16]/15 hover:text-[#A3E635]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/starelevenai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StarEleven AI on LinkedIn"
                title="LinkedIn"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] text-zinc-300 transition hover:border-[#84CC16]/60 hover:bg-[#84CC16]/15 hover:text-[#A3E635]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>

              {/* Email */}
              <a
                href="mailto:hello@starelevenai.com"
                aria-label="Email StarEleven AI"
                title="hello@starelevenai.com"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-[#121215] text-zinc-300 transition hover:border-[#84CC16]/60 hover:bg-[#84CC16]/15 hover:text-[#A3E635]"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-800/70 pt-6 text-center text-[11px] text-zinc-500">
            © {new Date().getFullYear()} StarEleven AI. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}