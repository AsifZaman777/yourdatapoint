"use client";

import { useState } from "react";
import { TopNavbar } from "@/components/layout/top-navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ContactSection } from "@/components/landing/contact-section";
import { LegalModal } from "@/components/shared/legal-modal";

export default function LandingPage() {
  const [legalModalType, setLegalModalType] = useState<"privacy" | "terms" | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNavbar />

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <ContactSection />
      </main>

      <Footer onOpenLegalModal={(type) => setLegalModalType(type)} />
      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />
    </div>
  );
}
