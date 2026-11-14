"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Terminal,
} from "lucide-react";

interface IndustryVertical {
  id: string;
  label: string;
  shortName: string;
  badge: string;
  icon: React.ElementType;
  headline: string;
  description: string;
  qualificationRule: string;
  sampleUserMessage: string;
  sampleAgentAction: string;
  sampleAiReply: string;
  impactMetric: string;
}

const VERTICALS: IndustryVertical[] = [
  {
    id: "agency",
    label: "Marketing & AI Agency",
    shortName: "Agency",
    badge: "Manage Multiple Clients",
    icon: Megaphone,
    headline: "Run Every Client Brand in Its Own Private Account",
    description:
      "Create a separate workspace for each retainer client with their own brand tone, budget limits, and staff access — all managed from your single agency login.",
    qualificationRule:
      "Automatically asks prospects about their monthly revenue, marketing goals, budget, and launch timeline.",
    sampleUserMessage:
      "Audit TechFlow SaaS and prepare a 90-day AI lead generation proposal.",
    sampleAgentAction:
      "Research + Proposal Team → Live Company Check & Scope Builder",
    sampleAiReply:
      "TechFlow has strong website traffic but slow follow-up. Adding a 24/7 AI Lead Qualifier can increase booked sales calls by +38% in 60 days.",
    impactMetric: "3.4x Faster Client Setup",
  },
  {
    id: "real_estate",
    label: "Real Estate & Property",
    shortName: "Real Estate",
    badge: "24/7 Buyer Qualification",
    icon: Building2,
    headline: "Filter Serious Cash Buyers Before Booking Property Tours",
    description:
      "Your AI property assistant chats with buyers 24/7, checks their budget, preferred area, and payment plan, and books site visits only for qualified leads.",
    qualificationRule:
      "Captures buyer budget, preferred neighborhood, 0–3 month buying timeline, and cash vs. installment preference.",
    sampleUserMessage:
      "Looking for a 3BR villa near Downtown under $850K with handover this year.",
    sampleAgentAction:
      "Property Advisor AI → Matching Listings & Scoring Buyer Budget",
    sampleAiReply:
      "Found 2 ready villas ($790K & $835K) with 6.8% rental yield. Would you like to book a private viewing this Thursday at 4:00 PM?",
    impactMetric: "68% More Qualified Visits",
  },
  {
    id: "ecommerce",
    label: "E-Commerce & Online Stores",
    shortName: "E-Commerce",
    badge: "Higher Store Conversions",
    icon: ShoppingBag,
    headline: "Help Shoppers Pick the Right Product & Increase Order Value",
    description:
      "Answer product questions instantly, recommend high-converting bundles, and clarify delivery times in your exact brand voice.",
    qualificationRule:
      "Understands customer skin/size preference, delivery city, and recommends matching bundle discounts.",
    sampleUserMessage:
      "Which skincare bundle works best for humid weather with fast delivery?",
    sampleAgentAction:
      "Shopping Copilot → Matching Best-Sellers & Checking Express Delivery",
    sampleAiReply:
      "Our Oil-Control Hydration Trio is made for humid weather and ships with 24-hour express delivery. Adding the SPF50 booster saves you 15%.",
    impactMetric: "+27% Average Order Value",
  },
  {
    id: "healthcare",
    label: "Healthcare & Clinics",
    shortName: "Healthcare",
    badge: "Safe Patient Routing",
    icon: Stethoscope,
    headline: "Guide Patients to the Right Specialist & Book Appointments",
    description:
      "Built-in medical safety rules ensure the AI never gives risky diagnoses while smoothly capturing symptoms and booking doctor slots.",
    qualificationRule:
      "Collects patient name, department needed, preferred doctor, and morning/evening appointment preference.",
    sampleUserMessage:
      "I have lower back stiffness and need a physiotherapy consultation.",
    sampleAgentAction:
      "Clinic Desk AI → Safety Check & Physiotherapy Slot Lookup",
    sampleAiReply:
      "I have routed your request to our Physiotherapy department. Dr. Sarah Malik is available tomorrow at 11:30 AM or 4:15 PM — which time suits you?",
    impactMetric: "Zero Missed Patient Calls",
  },
  {
    id: "education",
    label: "Education & Institutes",
    shortName: "Education",
    badge: "Student Admissions",
    icon: GraduationCap,
    headline: "Counsel Prospective Students & Fill Course Batches Faster",
    description:
      "Answer course fee, schedule, and eligibility questions automatically and guide interested students straight to admissions counseling.",
    qualificationRule:
      "Checks student education background, career goal, weekend/weekday preference, and fee installment needs.",
    sampleUserMessage:
      "Can working professionals join the weekend Applied AI course?",
    sampleAgentAction:
      "Admissions Counselor AI → Checking Weekend Batch & Fee Plan",
    sampleAiReply:
      "Yes! Our Weekend Executive Batch runs Saturdays & Sundays with live mentor labs and a 3-installment fee plan. Shall I reserve your counseling call?",
    impactMetric: "2.1x More Enrollments",
  },
  {
    id: "saas",
    label: "SaaS & Software Companies",
    shortName: "SaaS",
    badge: "Faster B2B Demos",
    icon: Briefcase,
    headline: "Answer Product Questions & Book Qualified Product Demos",
    description:
      "Help prospects understand your pricing, security, and integrations immediately while qualifying company size and timeline for your sales team.",
    qualificationRule:
      "Captures team size, current software stack, main workflow challenge, and target go-live date.",
    sampleUserMessage:
      "Does your platform support separate client workspaces and custom API keys?",
    sampleAgentAction:
      "Product Specialist AI → Security Check & Demo Calendar Sync",
    sampleAiReply:
      "Yes — every client gets a 100% isolated workspace and encrypted API key storage. Let's book a 20-minute walkthrough for your team.",
    impactMetric: "54% Faster Sales Cycle",
  },
];

interface IndustriesShowcaseProps {
  onOpenBookCall: (industryName?: string) => void;
}

export function IndustriesShowcase({
  onOpenBookCall,
}: IndustriesShowcaseProps) {
  const [activeId, setActiveId] = useState<string>("agency");
  const current =
    VERTICALS.find((v) => v.id === activeId) || VERTICALS[0];

  return (
    <section
      id="industries"
      className="border-b border-zinc-800/80 bg-[#09090B] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121215] px-3.5 py-1 text-xs font-semibold text-[#A3E635]">
            <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Built for Your Industry</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready-Made AI Assistants for Your Business Type
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Click your industry below to see how StarEleven talks to your
            customers, qualifies leads, and saves your team hours every day.
          </p>
        </div>

        {/* Industry Selector Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {VERTICALS.map((item) => {
            const Icon = item.icon;
            const isSelected = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
                  isSelected
                    ? "border-[#84CC16] bg-[#84CC16] text-[#09090B] shadow-[0_0_24px_rgba(132,204,22,0.25)]"
                    : "border-zinc-800 bg-[#121215] text-zinc-300 hover:border-zinc-700 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* FIXED 12-Column Responsive Split Card (6 Cols Left + 6 Cols Right) */}
        <div className="mt-8 grid grid-cols-1 items-stretch gap-6 rounded-2xl border border-zinc-800 bg-[#121215] p-6 sm:p-8 lg:grid-cols-12">
          {/* Left 6 Columns: Plain Business Value */}
          <div className="flex min-w-0 flex-col justify-between space-y-6 lg:col-span-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-1 text-[11px] font-bold text-[#A3E635]">
                  {current.badge}
                </span>
                <span className="rounded-full border border-zinc-700 bg-[#09090B] px-3 py-1 text-[11px] font-semibold text-zinc-200">
                  {current.impactMetric}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-extrabold leading-snug text-white">
                {current.headline}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-300">
                {current.description}
              </p>

              <div className="mt-5 rounded-xl border border-zinc-800 bg-[#09090B] p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A3E635]">
                  What Your AI Automatically Captures
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                  {current.qualificationRule}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/register?plan=byok_free&interval=annual"
                className="group inline-flex items-center gap-2 rounded-xl bg-[#84CC16] px-5 py-2.5 text-xs font-bold text-[#09090B] transition hover:bg-[#A3E635]"
              >
                <span>Try {current.shortName} Workspace Free</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                type="button"
                onClick={() => onOpenBookCall(current.shortName)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-[#09090B] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-[#84CC16]/50 hover:text-white"
              >
                <Calendar className="h-3.5 w-3.5 text-[#84CC16]" />
                <span>Book a Demo</span>
              </button>
            </div>
          </div>

          {/* Right 6 Columns: Fixed Full-Width Live Workflow Preview */}
          <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-zinc-800 bg-[#09090B] p-5 sm:p-6 lg:col-span-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold text-zinc-200">
                Real Example • {current.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#A3E635]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#84CC16]" />
                LIVE DEMO
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Step 1: Customer Question */}
              <div className="rounded-xl border border-zinc-800 bg-[#121215] p-3.5">
                <span className="text-[11px] font-semibold text-zinc-400">
                  1. Customer / Team Request
                </span>
                <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-100">
                  &ldquo;{current.sampleUserMessage}&rdquo;
                </p>
              </div>

              {/* Step 2: Behind-the-Scenes AI Action */}
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300">
                <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>2. {current.sampleAgentAction}</span>
              </div>

              {/* Step 3: Instant Helpful Reply */}
              <div className="rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/10 p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#A3E635]">
                  <Bot className="h-3.5 w-3.5" />
                  <span>3. StarEleven AI Reply</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-100">
                  {current.sampleAiReply}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#A3E635]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Saved automatically to your private client CRM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}