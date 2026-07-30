"use client";

import Image from "next/image";
import Link from "next/link";
import { Zap, Database, Search, User, Coins, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";
import { useAuth } from "@/providers/auth-provider";
import heroDashboardImg from "@/assets/hero_dashboard.png";

export function HeroSection() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Text & CTA */}
          <div className="space-y-6 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide">
              <Zap className="h-3.5 w-3.5" />
              <span>{t.hero.badge}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
              {t.hero.titlePrefix}
              <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                {t.hero.titleHighlight}
              </span>
              {t.hero.titleSuffix}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {t.hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link href="/catalog">
                <Button size="lg" className="gap-2 font-bold px-6 shadow-lg shadow-primary/20">
                  <Database className="h-5 w-5" />
                  {t.hero.btnDatasets}
                </Button>
              </Link>

              {user ? (
                <Link href="/scraper">
                  <Button size="lg" variant="outline" className="gap-2 font-semibold px-6 border-border/60">
                    <Search className="h-5 w-5" />
                    {t.hero.btnScraper}
                  </Button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button size="lg" variant="outline" className="gap-2 font-semibold px-6 border-border/60">
                    <User className="h-5 w-5" />
                    {t.hero.btnStart}
                  </Button>
                </Link>
              )}

              <a href="#pricing">
                <Button size="lg" variant="ghost" className="gap-2 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                  <Coins className="h-4 w-4" />
                  {t.hero.btnPricing}
                </Button>
              </a>
            </div>
          </div>

          {/* Right Column: Hero Image Frame */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-lg lg:max-w-none">
            <div className="relative rounded-2xl border border-border/50 bg-card/60 p-2 shadow-2xl backdrop-blur-xl glow-border animate-float">
              <Image
                src={heroDashboardImg}
                alt="MarketingOstad Dashboard Preview"
                width={800}
                height={500}
                priority
                className="rounded-xl w-full h-auto object-cover"
              />

              {/* Status Badges Overlay */}
              <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold shadow-lg backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                ⚡ {t.hero.statScraper}
              </div>

              <div className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 border border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold shadow-lg backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4" />
                {t.hero.statAccuracy}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
