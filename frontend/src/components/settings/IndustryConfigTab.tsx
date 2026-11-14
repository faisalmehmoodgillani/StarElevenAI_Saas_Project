"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  ShoppingBag,
  Stethoscope,
  GraduationCap,
  Megaphone,
  Briefcase,
  CheckCircle2,
  Sparkles,
  Sliders,
  Save,
  Loader2,
  Eye,
} from "lucide-react";

export interface IndustryConfigData {
  brand_tone: string;
  target_audience: string;
  qualification_criteria: string;
  custom_instructions: string;
  language_style: string;
}

interface IndustryPreset {
  id: string;
  label: string;
  tagline: string;
  icon: React.ElementType;
  badge: string;
  defaultTone: string;
  defaultAudience: string;
  defaultCriteria: string;
  defaultInstructions: string;
}

const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: "real_estate",
    label: "Real Estate & Property",
    tagline: "Property matching, site visits & buyer/investor qualification",
    icon: Building2,
    badge: "High Conversion",
    defaultTone: "Consultative & Executive",
    defaultAudience: "Property buyers, commercial investors, and rental leads",
    defaultCriteria:
      "Qualify budget range, preferred location/society, timeline to buy (0-3 months), and cash vs. installment preference.",
    defaultInstructions:
      "Always ask for preferred location and budget range before suggesting properties. Offer to book a physical or virtual site tour.",
  },
  {
    id: "ecommerce",
    label: "E-Commerce & D2C",
    tagline: "Product recommendations, order support & cart recovery",
    icon: ShoppingBag,
    badge: "24/7 Sales",
    defaultTone: "Friendly & Persuasive",
    defaultAudience: "Online shoppers, repeat buyers, and COD/prepaid customers",
    defaultCriteria:
      "Identify product category interest, size/variant preference, shipping city, and urgency.",
    defaultInstructions:
      "Recommend best-selling bundles, clarify delivery timelines clearly, and guide users smoothly toward checkout.",
  },
  {
    id: "healthcare",
    label: "Healthcare & Clinics",
    tagline: "Appointment triage, doctor schedules & patient FAQs",
    icon: Stethoscope,
    badge: "Clinical Care",
    defaultTone: "Empathetic & Clinical",
    defaultAudience: "Patients booking consultations, diagnostics, and follow-ups",
    defaultCriteria:
      "Capture patient name, primary symptom/department needed, preferred doctor, and appointment date/time.",
    defaultInstructions:
      "Never provide definitive medical diagnoses. Gather symptoms politely and prioritize booking an appointment with the right specialist.",
  },
  {
    id: "education",
    label: "Education & EdTech",
    tagline: "Course counseling, admissions & student onboarding",
    icon: GraduationCap,
    badge: "Admissions",
    defaultTone: "Encouraging & Informative",
    defaultAudience: "Prospective students, parents, and working professionals",
    defaultCriteria:
      "Assess current education level, career goal, preferred batch timing (weekend/weekday), and fee plan.",
    defaultInstructions:
      "Highlight course outcomes, practical projects, and scholarship or installment options to help students enroll.",
  },
  {
    id: "marketing_agency",
    label: "Marketing & AI Agency",
    tagline: "Client discovery calls, retainers & growth audits",
    icon: Megaphone,
    badge: "Agency Pro",
    defaultTone: "Strategic & Results-Driven",
    defaultAudience: "Founders, CMOs, and B2B businesses seeking growth",
    defaultCriteria:
      "Qualify current monthly revenue, primary growth bottleneck, ad spend/automation budget, and decision-maker role.",
    defaultInstructions:
      "Position solutions around ROI, lead generation, and workflow automation. Push qualified prospects to book a strategy call.",
  },
  {
    id: "general_b2b",
    label: "General B2B & SaaS",
    tagline: "Enterprise support, demos & custom B2B workflows",
    icon: Briefcase,
    badge: "Flexible",
    defaultTone: "Professional & Concise",
    defaultAudience: "B2B clients, partners, and enterprise stakeholders",
    defaultCriteria:
      "Capture company name, team size, core pain point, and desired implementation timeline.",
    defaultInstructions:
      "Keep responses structured, actionable, and aligned with enterprise B2B communication standards.",
  },
];

interface IndustryConfigTabProps {
  workspaceId: string;
  workspaceName: string;
  initialIndustry?: string;
  initialConfig?: Partial<IndustryConfigData>;
  onSaved?: (industry: string, config: IndustryConfigData) => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function IndustryConfigTab({
  workspaceId,
  workspaceName,
  initialIndustry = "general_b2b",
  initialConfig,
  onSaved,
}: IndustryConfigTabProps) {
  const [selectedIndustry, setSelectedIndustry] =
    useState<string>(initialIndustry);
  const [config, setConfig] = useState<IndustryConfigData>({
    brand_tone: initialConfig?.brand_tone || "Professional & Concise",
    target_audience:
      initialConfig?.target_audience ||
      "B2B clients, partners, and enterprise stakeholders",
    qualification_criteria:
      initialConfig?.qualification_criteria ||
      "Capture company name, core pain point, budget, and timeline.",
    custom_instructions:
      initialConfig?.custom_instructions ||
      "Respond clearly, accurately, and represent the brand professionally.",
    language_style: initialConfig?.language_style || "English (Adaptive)",
  });

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (initialIndustry) setSelectedIndustry(initialIndustry);
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      setConfig((prev) => ({ ...prev, ...initialConfig }));
    }
  }, [initialIndustry, initialConfig]);

  const handleSelectPreset = (preset: IndustryPreset) => {
    setSelectedIndustry(preset.id);
    setConfig({
      brand_tone: preset.defaultTone,
      target_audience: preset.defaultAudience,
      qualification_criteria: preset.defaultCriteria,
      custom_instructions: preset.defaultInstructions,
      language_style: config.language_style || "English (Adaptive)",
    });
    setStatusMessage(null);
  };

  const handleSaveIndustryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industry: selectedIndustry,
            industry_config: config,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail || "Failed to update industry configuration."
        );
      }

      setStatusMessage({
        type: "success",
        text: "Industry AI persona & custom domain rules saved!",
      });
      onSaved?.(selectedIndustry, config);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save industry configuration.";
      setStatusMessage({
        type: "error",
        text: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const activePreset =
    INDUSTRY_PRESETS.find((p) => p.id === selectedIndustry) ||
    INDUSTRY_PRESETS[5];

  return (
    <div className="space-y-6">
      {/* 1-Click Industry Vertical Grid */}
      <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#84CC16]" />
              <h2 className="text-base font-bold text-white">
                Industry Vertical Preset
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Select your business vertical to automatically tailor AI
              terminology, tone, and lead qualification logic.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/10 px-3 py-1 font-mono text-[11px] font-semibold text-[#A3E635]">
            ACTIVE: {activePreset.label.toUpperCase()}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRY_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedIndustry === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? "border-[#84CC16] bg-[#84CC16]/10 shadow-[0_0_20px_rgba(132,204,22,0.12)]"
                    : "border-zinc-800 bg-[#09090B]/80 hover:border-zinc-700 hover:bg-zinc-900/70"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                        isSelected
                          ? "border-[#84CC16]/50 bg-[#84CC16]/20 text-[#A3E635]"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 group-hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-[#84CC16]" />
                    ) : (
                      <span className="rounded bg-zinc-800/90 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                        {preset.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-zinc-100">
                    {preset.label}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {preset.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fine-Tune Industry AI Behavior & Live Prompt Preview */}
      <form
        onSubmit={handleSaveIndustryConfig}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-[#121215] p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Sliders className="h-4 w-4 text-[#84CC16]" />
            <h3 className="text-sm font-bold text-white">
              Custom Domain Rules & Brand Voice
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                Brand Communication Tone
              </label>
              <select
                value={config.brand_tone}
                onChange={(e) =>
                  setConfig({ ...config, brand_tone: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-100 focus:border-[#84CC16] focus:outline-none"
              >
                <option value="Consultative & Executive">
                  Consultative & Executive
                </option>
                <option value="Friendly & Persuasive">
                  Friendly & Persuasive
                </option>
                <option value="Empathetic & Clinical">
                  Empathetic & Clinical
                </option>
                <option value="Strategic & Results-Driven">
                  Strategic & Results-Driven
                </option>
                <option value="Professional & Concise">
                  Professional & Concise
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                Response Language Style
              </label>
              <select
                value={config.language_style}
                onChange={(e) =>
                  setConfig({ ...config, language_style: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-100 focus:border-[#84CC16] focus:outline-none"
              >
                <option value="English (Adaptive)">English (Adaptive)</option>
                <option value="Bilingual (English + Roman Urdu)">
                  Bilingual (English + Roman Urdu)
                </option>
                <option value="Arabic / Gulf Business">
                  Arabic / Gulf Business
                </option>
                <option value="Formal UK/US English">
                  Formal UK/US English
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              Target Audience / Customer Persona
            </label>
            <input
              type="text"
              value={config.target_audience}
              onChange={(e) =>
                setConfig({ ...config, target_audience: e.target.value })
              }
              placeholder="e.g. Commercial real estate investors and residential buyers"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              Lead Qualification Criteria
            </label>
            <textarea
              rows={2}
              value={config.qualification_criteria}
              onChange={(e) =>
                setConfig({
                  ...config,
                  qualification_criteria: e.target.value,
                })
              }
              placeholder="Define what makes a lead qualified (Budget, Timeline, Location...)"
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300">
              Custom Guardrails & Agent Instructions
            </label>
            <textarea
              rows={3}
              value={config.custom_instructions}
              onChange={(e) =>
                setConfig({ ...config, custom_instructions: e.target.value })
              }
              placeholder="Add company-specific rules, pricing policies, or call-to-action instructions..."
              className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#84CC16] focus:outline-none"
            />
          </div>

          {statusMessage && (
            <div
              className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
                statusMessage.type === "success"
                  ? "border-[#84CC16]/40 bg-[#84CC16]/10 text-[#A3E635]"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#84CC16] px-5 py-2.5 text-xs font-bold text-[#09090B] shadow-lg shadow-[#84CC16]/15 transition hover:bg-[#A3E635] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving AI Brain...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Industry Configuration
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live System Prompt Preview */}
        <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#09090B] p-5">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#A3E635]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Live System Persona
                </h4>
              </div>
              <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                PREVIEW
              </span>
            </div>

            <div className="mt-3 space-y-2.5 rounded-xl border border-zinc-800/80 bg-[#121215] p-3.5 font-mono text-[11px] leading-relaxed text-zinc-300">
              <p className="text-[#A3E635]">
                # WORKSPACE: {workspaceName || "Workspace"}
              </p>
              <p>
                <span className="text-zinc-500">VERTICAL:</span>{" "}
                {activePreset.label}
              </p>
              <p>
                <span className="text-zinc-500">TONE:</span> {config.brand_tone}
              </p>
              <p>
                <span className="text-zinc-500">LANGUAGE:</span>{" "}
                {config.language_style}
              </p>
              <p>
                <span className="text-zinc-500">AUDIENCE:</span>{" "}
                {config.target_audience}
              </p>
              <div className="border-t border-zinc-800 pt-2">
                <span className="text-zinc-500">QUALIFICATION:</span>
                <p className="mt-0.5 text-zinc-300">
                  {config.qualification_criteria}
                </p>
              </div>
              <div className="border-t border-zinc-800 pt-2">
                <span className="text-zinc-500">GUARDRAILS:</span>
                <p className="mt-0.5 text-zinc-300">
                  {config.custom_instructions}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-zinc-500">
            Applied automatically across all active workspace AI agents during
            conversations.
          </p>
        </div>
      </form>
    </div>
  );
}