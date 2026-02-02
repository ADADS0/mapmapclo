"use client";

import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CTASection } from "@/components/landing/CTASection";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CTASection />

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>CryptoViz Pro - Blockchain Network Visualization</p>
        </div>
      </footer>
    </main>
  );
}
