"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { AgentFlowVisual } from "@/components/landing/AgentFlowVisual";
import { CapabilitiesBento } from "@/components/landing/CapabilitiesBento";
import { ComparisonMatrix } from "@/components/landing/ComparisonMatrix";
import { IndustriesShowcase } from "@/components/landing/IndustriesShowcase";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqAndCta } from "@/components/landing/FaqAndCta";
import { BookCallModal } from "@/components/landing/BookCallModal";

export default function HomePage() {
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("Agency");

  const handleOpenBookCall = (industryName?: string) => {
    if (industryName && industryName.trim()) {
      setSelectedIndustry(industryName.trim());
    }
    setBookCallOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 selection:bg-[#84CC16]/30 selection:text-[#A3E635]">
      <Navbar onOpenBookCall={() => handleOpenBookCall()} />

      <main>
        <HeroSection onOpenBookCall={() => handleOpenBookCall()} />
        <AgentFlowVisual />
        <CapabilitiesBento />
        <ComparisonMatrix />
        <IndustriesShowcase onOpenBookCall={handleOpenBookCall} />
        <PricingSection />
        <FaqAndCta onOpenBookCall={() => handleOpenBookCall()} />
      </main>

      <BookCallModal
        isOpen={bookCallOpen}
        onClose={() => setBookCallOpen(false)}
        defaultIndustry={selectedIndustry}
      />
    </div>
  );
}