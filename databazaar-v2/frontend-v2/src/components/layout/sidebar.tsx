"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Database,
  Search,
  Send,
  Zap,
  Settings,
  Inbox,
  Coins,
  User,
  Shield,
  LogOut,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { APP_NAME } from "@/lib/constants";

interface SidebarProps {
  onOpenPaymentModal?: () => void;
}

export function Sidebar({ onOpenPaymentModal }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { lang, toggleLang } = useLanguage();

  if (!user) return null;

  const isSuperadmin = user.role === "superadmin";

  const adminNav = [
    { label: "Admin Overview", href: "/admin", icon: Settings },
    { label: "Dataset Requests", href: "/admin/requests", icon: Inbox, badgeColor: "text-amber-500" },
    { label: "Payment Verification", href: "/admin/payments", icon: Coins, badgeColor: "text-amber-500" },
    { label: "Gateway & QR Settings", href: "/admin/gateway", icon: Settings, iconColor: "text-cyan-500" },
    { label: "Customers & Credits", href: "/users", icon: User },
    { label: "Security Module", href: "/security", icon: Shield, isDanger: true },
  ];

  const mainNav = [
    { label: "Datasets Catalog", href: "/catalog", icon: Database },
    {
      label: isAdmin ? "Live Scraper Console" : "Dataset Request Portal",
      href: "/scraper",
      icon: Search,
    },
    { label: "Marketing Portal", href: "/marketing", icon: Send },
    { label: "Upgrade Package", href: "/upgrade", icon: Zap, iconColor: "text-amber-500" },
  ];

  return (
    <aside className="w-64 border-r border-border/40 bg-card/40 backdrop-blur-xl flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <Link href="/catalog" className="flex items-center gap-2 font-bold text-base tracking-tight hover:opacity-80">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>{APP_NAME}</span>
        </Link>
        {isSuperadmin && (
          <Badge className="bg-purple-600 text-[10px] px-1.5 py-0.5 font-bold">SUPERADMIN</Badge>
        )}
        {!isSuperadmin && isAdmin && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 font-bold">ADMIN</Badge>
        )}
      </div>

      {/* Menu Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Admin Section */}
        {isAdmin && (
          <div className="space-y-1">
            <div className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Administration
            </div>
            {adminNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-sm"
                      : item.isDanger
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                >
                  <Icon className={`h-4 w-4 ${item.iconColor || ""}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Main Navigation Section */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Main Navigation
          </div>
          {mainNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
              >
                <Icon className={`h-4 w-4 ${item.iconColor || ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer / Account Controls */}
      <div className="p-3 border-t border-border/40 space-y-3 bg-card/60">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="w-full text-xs h-8 justify-center gap-2 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
        >
          <Globe className="h-3.5 w-3.5" />
          {lang === "en" ? "🇧🇩 বাংলা ভাষা" : "🇺🇸 English"}
        </Button>

        <div className="text-xs text-muted-foreground truncate px-1" title={user.email}>
          <User className="h-3 w-3 inline mr-1 opacity-70" />
          {user.email}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenPaymentModal}
            className="flex-1 text-xs h-8 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-600 hover:to-amber-700"
          >
            <Coins className="h-3.5 w-3.5 mr-1" />
            {user.credits} CR ➕ Buy
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
