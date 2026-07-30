"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Database, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { useLanguage } from "@/providers/language-provider";
import { APP_NAME } from "@/lib/constants";

export function TopNavbar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { label: t.nav.home, href: "/", section: "" },
    { label: t.nav.datasets, href: "/catalog", section: "catalog", icon: Database },
    { label: t.nav.features, href: "/#features", section: "features" },
    { label: t.nav.pricing, href: "/#pricing", section: "pricing" },
    { label: t.nav.contact, href: "/#contact", section: "contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
          <BarChart3 className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href.split("#")[0]) && item.href !== "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link href="/auth">
            <Button size="sm" className="gap-2 rounded-lg font-semibold">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t.nav.loginRegister}</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
