"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopNavbar } from "@/components/layout/top-navbar";
import { Footer } from "@/components/layout/footer";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ContactSection } from "@/components/landing/contact-section";
import { LegalModal } from "@/components/shared/legal-modal";

function VerifyRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("verify_token");
    if (token) {
      router.replace(`/auth?verify_token=${encodeURIComponent(token)}`);
    }
  }, [searchParams, router]);

  return null;
}

export default function LandingPage() {
  const [legalModalType, setLegalModalType] = useState<"privacy" | "terms" | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Suspense fallback={null}>
        <VerifyRedirect />
      </Suspense>
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
