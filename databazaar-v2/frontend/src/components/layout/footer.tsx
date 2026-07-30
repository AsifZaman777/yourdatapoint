"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { APP_NAME } from "@/lib/constants";

interface FooterProps {
  onOpenLegalModal?: (type: "privacy" | "terms") => void;
}

export function Footer({ onOpenLegalModal }: FooterProps) {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/40 bg-card/30 backdrop-blur-xl mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <BarChart3 className="h-6 w-6 text-primary" />
              <span>{APP_NAME}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              {t.footer.desc}
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {t.footer.systemActive}
            </div>
          </div>

          {/* Categories Col */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">{t.footer.catTitle}</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/catalog?category=Coaching+Center" className="hover:text-primary transition-colors">
                  Coaching Centers
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Pharmacy" className="hover:text-primary transition-colors">
                  Pharmacies
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Restaurant" className="hover:text-primary transition-colors">
                  Restaurants
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=Hospital+%26+Clinic" className="hover:text-primary transition-colors">
                  Hospitals & Clinics
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=School+%26+College" className="hover:text-primary transition-colors">
                  Schools & Colleges
                </Link>
              </li>
            </ul>
          </div>

          {/* Pricing Col */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">{t.footer.pricingTitle}</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/#pricing" className="hover:text-primary transition-colors">
                  Starter Pack (৳200/mo)
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-primary transition-colors">
                  Growth Pack (৳500/mo)
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-primary transition-colors">
                  Credit Packs (from ৳50)
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-primary transition-colors">
                  Enterprise ERP Pack
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support Col */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">{t.footer.legalTitle}</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegalModal?.("privacy")}
                  className="hover:text-primary transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegalModal?.("terms")}
                  className="hover:text-primary transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-primary transition-colors">
                  Contact Sales
                </Link>
              </li>
              <li>
                <Link href="/auth" className="hover:text-primary transition-colors">
                  Login / Register
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground font-mono">
          <div>{t.footer.rights}</div>
          <div>{t.footer.designSystem}</div>
        </div>
      </div>
    </footer>
  );
}
