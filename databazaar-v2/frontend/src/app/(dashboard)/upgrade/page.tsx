"use client";

import { useState } from "react";
import { PricingSection } from "@/components/landing/pricing-section";
import { PaymentWizardModal } from "@/components/payment/payment-wizard-modal";
import { useLanguage } from "@/providers/language-provider";
import type { PaymentPackage } from "@/lib/types";

export default function UpgradePage() {
  const { t } = useLanguage();
  const pt = t.pricing || {};
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PaymentPackage | null>(null);

  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPkg(pkg);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{pt.title || "Upgrade & BDT Credit Packages"}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {pt.badge || "Recharge credits or select flexible subscription tiers for unlimited lead scraping and campaigns"}
        </p>
      </div>

      <PricingSection onSelectPackage={handleSelectPackage} />

      <PaymentWizardModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
