import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { ComparisonMatrix } from "@/components/landing/ComparisonMatrix";
import { CapabilitiesBento } from "@/components/landing/CapabilitiesBento";
import { IndustriesShowcase } from "@/components/landing/IndustriesShowcase";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqAndCta } from "@/components/landing/FaqAndCta";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 selection:bg-[#84CC16]/30 selection:text-[#A3E635]">
      <Navbar />
      <main>
        <HeroSection />
        <ComparisonMatrix />
        <CapabilitiesBento />
        <IndustriesShowcase />
        <PricingSection />
        <FaqAndCta />
      </main>
    </div>
  );
}