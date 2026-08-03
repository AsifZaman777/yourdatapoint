"use client";

import { useState } from "react";
import { PricingSection } from "@/components/landing/pricing-section";
import { PaymentWizardModal } from "@/components/payment/payment-wizard-modal";
import { useLanguage } from "@/providers/language-provider";
import type { PaymentPackage } from "@/lib/types";

import Link from "next/link";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";

export default function UpgradePage() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const pt = t.pricing || {};
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PaymentPackage | null>(null);

  const handleSelectPackage = (pkg: PaymentPackage) => {
    setSelectedPkg(pkg);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{pt.title || "Upgrade & BDT Credit Packages"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {pt.badge || "Recharge credits or select flexible subscription tiers for unlimited lead scraping and campaigns"}
          </p>
        </div>

        {isAdmin && (
          <Link href="/admin?tab=packages">
            <Button size="sm" variant="outline" className="gap-2 text-xs font-bold border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
              <Coins className="h-4 w-4" /> Package Settings (Super Admin)
            </Button>
          </Link>
        )}
      </div>

      <PricingSection onSelectPackage={handleSelectPackage} />

      <PaymentWizardModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
