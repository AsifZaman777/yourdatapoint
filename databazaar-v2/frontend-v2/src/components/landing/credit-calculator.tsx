"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/providers/language-provider";

interface CreditCalculatorProps {
  customRate?: number;
  minCredits?: number;
  maxCredits?: number;
}

export function CreditCalculator({
  customRate = 7.5,
  minCredits = 5,
  maxCredits = 500,
}: CreditCalculatorProps) {
  const { t } = useLanguage();
  const [credits, setCredits] = useState(50);

  const totalBDT = (credits * customRate).toFixed(
    (credits * customRate) % 1 === 0 ? 0 : 2
  );

  return (
    <Card className="glass-panel border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card p-6 sm:p-8 mt-12">
      <CardContent className="p-0 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          <h3 className="text-xl font-bold text-foreground">{t.pricing.calcTitle}</h3>
        </div>

        <p className="text-sm text-muted-foreground">{t.pricing.calcDesc}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
          {/* Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{t.pricing.calcSelectLabel}</span>
              <span className="font-mono font-bold text-amber-500 text-lg">
                {credits} Credits
              </span>
            </div>

            <Slider
              value={[credits]}
              min={minCredits}
              max={maxCredits}
              step={5}
              onValueChange={(val) => {
                const num = Array.isArray(val) ? val[0] : typeof val === "number" ? val : 50;
                setCredits(num);
              }}
              className="py-2"
            />

            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{minCredits} CR</span>
              <span>{Math.round((maxCredits + minCredits) / 2)} CR</span>
              <span>{maxCredits} CR</span>
            </div>
          </div>

          {/* Price Output Display */}
          <div className="rounded-xl border border-border/50 bg-background/80 p-6 text-center space-y-1 backdrop-blur-md">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {t.pricing.calcTotalPayable}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-500">
              ৳{totalBDT} BDT
            </div>
            <div className="text-xs text-muted-foreground">
              @ ৳{customRate} BDT / Credit (Min: {minCredits} Credits)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
