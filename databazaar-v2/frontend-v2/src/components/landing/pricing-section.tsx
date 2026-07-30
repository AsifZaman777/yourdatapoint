"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCalculator } from "@/components/landing/credit-calculator";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import { paymentsApi } from "@/lib/api/payments";
import type { PaymentConfig, PaymentPackage } from "@/lib/types";

interface PricingSectionProps {
  onSelectPackage?: (pkg: PaymentPackage) => void;
}

export function PricingSection({ onSelectPackage }: PricingSectionProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [config, setConfig] = useState<PaymentConfig | null>(null);

  useEffect(() => {
    paymentsApi
      .packagesConfig()
      .then((res) => setConfig(res.data))
      .catch(() => {});
  }, []);

  const packages = config?.packages || [];

  return (
    <section id="pricing" className="py-20 border-t border-border/40 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold uppercase tracking-wider">
            {t.pricing.badge}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t.pricing.title}
          </h2>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {packages.map((pkg) => {
            const isPopular = pkg.popular;
            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? "glass-panel border-amber-500/50 shadow-2xl shadow-amber-500/10 scale-105"
                    : "glass-panel border-border/40 hover:border-border"
                }`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold uppercase tracking-wider text-[11px] px-3 py-1">
                    {pkg.badge || "MOST POPULAR"}
                  </Badge>
                )}

                <CardHeader className="space-y-3 p-6 sm:p-8">
                  <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground">
                      ৳{pkg.price_bdt}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      BDT / {pkg.credits} CR
                    </span>
                  </div>

                  {pkg.save_badge && (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-xs w-fit">
                      {pkg.save_badge}
                    </Badge>
                  )}

                  <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                    {pkg.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 sm:p-8 pt-0 flex-1 flex flex-col justify-between space-y-6">
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => {
                      if (onSelectPackage) {
                        onSelectPackage(pkg);
                      }
                    }}
                    className={`w-full font-bold text-sm ${
                      isPopular
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-600 hover:to-amber-700"
                        : ""
                    }`}
                    variant={isPopular ? "default" : "outline"}
                  >
                    {!onSelectPackage ? (
                      <Link href={user ? "/upgrade" : "/auth"} className="w-full text-center">
                        {user ? `Upgrade to ${pkg.name}` : `Get Started`}
                      </Link>
                    ) : (
                      <span>Select {pkg.name}</span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Credit Calculator */}
        <CreditCalculator
          customRate={config?.custom_package?.price_per_credit_bdt}
          minCredits={config?.custom_package?.min_credits}
          maxCredits={config?.custom_package?.max_credits}
        />
      </div>
    </section>
  );
}
