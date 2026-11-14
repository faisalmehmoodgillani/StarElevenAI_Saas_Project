"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
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
    badge: "Multi-Client Workspaces",
    icon: Megaphone,
    headline: "Manage Every Client Brand in Its Own Isolated Workspace",
    description:
      "Spin up dedicated workspaces per retainer client with separate BYOK keys or Managed token pools, custom brand voice rules, and Operator team seats.",
    qualificationRule:
      "Capture monthly revenue, primary acquisition bottleneck, automation budget, and decision-maker timeline.",
    sampleUserMessage:
      "Audit TechFlow SaaS and prepare a 90-day AI inbound funnel scope.",
    sampleAgentAction:
      "Auto Meta-Router → Tavily Market Audit + Agency Proposal Subgraph",
    sampleAiReply:
      "TechFlow shows 42% organic traffic growth but lacks automated demo triage. Deploying a 2-tier AI qualifier projects +38% SQL conversion in 60 days.",
    impactMetric: "3.4x Faster Client Onboarding",
  },
  {
    id: "real_estate",
    label: "Real Estate & Property",
    shortName: "Real Estate",
    badge: "High-Ticket Qualification",
    icon: Building2,
    headline: "Qualify Cash Buyers & Investors 24/7 Before Booking Site Tours",
    description:
      "Pre-configured consultative real estate prompts capture budget brackets, preferred communities, payment plans, and purchase urgency automatically.",
    qualificationRule:
      "Qualify budget range, target community, 0–3 month purchase window, and cash vs. installment preference.",
    sampleUserMessage:
      "Looking for a 3BR villa near Downtown under $850K with handover this year.",
    sampleAgentAction:
      "CRM Agent → Inventory Match + Investor Qualification Scoring",
    sampleAiReply:
      "Matched 2 ready-to-handover villas ($790K & $835K) with 6.8% projected yield. Would you prefer a Thursday 4 PM private viewing or virtual walkthrough?",
    impactMetric: "68% Higher Qualified Site Visits",
  },
  {
    id: "ecommerce",
    label: "E-Commerce & D2C",
    shortName: "E-Commerce",
    badge: "24/7 Conversion Copilot",
    icon: ShoppingBag,
    headline: "Turn Product Questions Into High-AOV Bundle Conversions",
    description:
      "Guide shoppers with instant catalog recommendations, shipping clarity, and persuasive bundle upsells aligned with your D2C brand tone.",
    qualificationRule:
      "Identify product category, sizing/variant needs, delivery city, and COD vs. prepaid preference.",
    sampleUserMessage:
      "Which skincare bundle works best for humid weather and fast delivery?",
    sampleAgentAction:
      "General Copilot → D2C Product Matcher + Shipping Policy Guardrail",
    sampleAiReply:
      "Our Oil-Control Hydration Trio is formulated for high humidity and ships same-day with 24-hour express delivery. Adding the SPF50 booster unlocks 15% bundle savings.",
    impactMetric: "+27% Average Order Value",
  },
  {
    id: "healthcare",
    label: "Healthcare & Clinics",
    shortName: "Healthcare",
    badge: "Guardrail-Protected Triage",
    icon: Stethoscope,
    headline: "Empathetic Patient Triage & Specialist Appointment Routing",
    description:
      "Strict clinical guardrails prevent unauthorized medical diagnoses while capturing symptoms, department needs, and preferred consultation slots.",
    qualificationRule:
      "Capture patient full name, primary symptom/department, preferred specialist, and morning/evening slot.",
    sampleUserMessage:
      "I have persistent lower back stiffness and need a physiotherapy consult.",
    sampleAgentAction:
      "Meta-Router → Clinical Safety Guardrail + Spine & Rehab Scheduler",
    sampleAiReply:
      "I have routed your request to our Orthopedics & Physiotherapy desk. Dr. Sarah Malik has openings tomorrow at 11:30 AM or 4:15 PM—which slot works best for you?",
    impactMetric: "Zero Missed Patient Inquiries",
  },
  {
    id: "education",
    label: "Education & EdTech",
    shortName: "Education",
    badge: "Admissions Engine",
    icon: GraduationCap,
    headline: "Counsel Prospective Students & Automate Cohort Admissions",
    description:
      "Assess academic background, career objectives, and weekend vs. weekday batch availability to guide applicants smoothly toward enrollment.",
    qualificationRule:
      "Evaluate current qualification, target career track, preferred batch schedule, and installment plan needs.",
    sampleUserMessage:
      "Can working professionals join the Applied AI Engineering cohort?",
    sampleAgentAction:
      "CRM Agent → Cohort Eligibility Check + Scholarship Rules",
    sampleAiReply:
      "Yes—our Weekend Executive Track runs Saturdays & Sundays with live mentor labs and a 3-part tuition plan. Shall I reserve your admissions counseling call?",
    impactMetric: "2.1x Enrollment Conversion",
  },
  {
    id: "saas",
    label: "SaaS & B2B Tech",
    shortName: "SaaS",
    badge: "RevOps & Enterprise",
    icon: Briefcase,
    headline: "Accelerate Enterprise Discovery, Security Reviews & Demos",
    description:
      "Equip your GTM team with live competitor research, technical architecture answers, and structured B2B lead qualification.",
    qualificationRule:
      "Capture company size, current tech stack, core workflow bottleneck, and target deployment timeline.",
    sampleUserMessage:
      "Does your platform support SOC2-aligned tenant isolation and custom API keys?",
    sampleAgentAction:
      "Research + Technical Copilot → Enterprise Architecture Brief",
    sampleAiReply:
      "Yes—every workspace enforces PostgreSQL Row-Level Security and Fernet AES-256 encrypted BYOK storage. Let's schedule a 20-minute architecture walkthrough.",
    impactMetric: "54% Shorter Sales Cycle",
  },
];

export function IndustriesShowcase() {
  const [activeId, setActiveId] = useState<string>("agency");
  const current =
    VERTICALS.find((v) => v.id === activeId) || VERTICALS[0];

  return (
    <section
      id="industries"
      className="border-b border-zinc-800/80 bg-[#09090B] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#121215] px-3.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-[#A3E635]">
            <Sparkles className="h-3.5 w-3.5 text-[#84CC16]" />
            <span>Industry AI Brain</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Pre-Trained Vertical Intelligence Out of the Box
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Select your business vertical during workspace creation to inject
            tailored qualification criteria, brand tone, and safety guardrails
            into every agent.
          </p>
        </div>

        {/* Vertical Selector Tabs */}
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

        {/* Active Industry Interactive Card */}
        <div className="mt-8 grid grid-cols-1 gap-6 rounded-2xl border border-zinc-800 bg-[#121215] p-6 sm:p-8 lg:grid-cols-12">
          {/* Left 6 Cols: Domain Strategy & Qualification Rules */}
          <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-[#84CC16]/40 bg-[#84CC16]/15 px-3 py-1 font-mono text-[11px] font-bold text-[#A3E635]">
                  {current.badge}
                </span>
                <span className="rounded-full border border-zinc-800 bg-[#09090B] px-3 py-1 font-mono text-[11px] text-zinc-300">
                  {current.impactMetric}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-extrabold text-white">
                {current.headline}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                {current.description}
              </p>

              <div className="mt-5 rounded-xl border border-zinc-800 bg-[#09090B] p-4">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#A3E635]">
                  Active Qualification Guardrail
                </span>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
                  {current.qualificationRule}
                </p>
              </div>
            </div>

            <div>
              <Link
                href="/register?plan=byok_free&interval=annual"
                className="group inline-flex items-center gap-2 rounded-xl border border-[#84CC16]/50 bg-[#84CC16]/15 px-5 py-2.5 text-xs font-bold text-[#A3E635] transition hover:bg-[#84CC16] hover:text-[#09090B]"
              >
                <span>Launch {current.shortName} Workspace Free</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right 6 Cols: Simulated Workflow Execution */}
          <div className="flex flex-col justify-center rounded-2xl border border-zinc-800 bg-[#09090B] p-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="font-mono text-[11px] font-bold text-zinc-300">
                LIVE WORKFLOW SIMULATION • {current.label.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#A3E635]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#84CC16]" />
                ACTIVE
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Inbound Inquiry */}
              <div className="rounded-xl border border-zinc-800 bg-[#121215] p-3.5">
                <span className="font-mono text-[10px] uppercase text-zinc-500">
                  1. Inbound Prompt / Lead Query
                </span>
                <p className="mt-1 text-xs font-medium text-zinc-100">
                  &ldquo;{current.sampleUserMessage}&rdquo;
                </p>
              </div>

              {/* Agent Routing */}
              <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 font-mono text-[11px] text-amber-300">
                <Terminal className="h-3.5 w-3.5 shrink-0" />
                <span>2. {current.sampleAgentAction}</span>
              </div>

              {/* AI Conversion Output */}
              <div className="rounded-xl border border-[#84CC16]/40 bg-[#84CC16]/10 p-3.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-[#A3E635]">
                  <Bot className="h-3.5 w-3.5" />
                  <span>3. StarEleven Agent Response</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-100">
                  {current.sampleAiReply}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10px] text-[#A3E635]">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Logged to Tenant Checkpoint & CRM Pipeline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}