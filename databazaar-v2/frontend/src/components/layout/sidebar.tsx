"use client";

import { useState } from "react";
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
  ChevronDown,
  ChevronRight,
  Users,
  CreditCard,
  Lock,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onOpenPaymentModal?: () => void;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  iconColor?: string;
  isDanger?: boolean;
};

type NavGroup = {
  title: string;
  icon: React.ElementType;
  color?: string;
  items: NavItem[];
};

// ─── Sidebar inner content (shared between desktop + mobile) ──────
function SidebarInner({
  collapsed,
  onClose,
  onOpenPaymentModal,
}: {
  collapsed: boolean;
  onClose?: () => void;
  onOpenPaymentModal?: () => void;
}) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { lang, toggleLang } = useLanguage();
  const isSuperadmin = user?.role === "superadmin";

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Administration: true,
    "Customer Management": true,
    "Dataset Management": true,
    "Payment Module": false,
    "Security Management": false,
    "Main Navigation": true,
  });

  const toggleGroup = (title: string) =>
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));

  // ── Admin grouped nav ──
  const adminGroups: NavGroup[] = [
    {
      title: "Administration",
      icon: Settings,
      color: "text-cyan-400",
      items: [
        { label: "Admin Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Dataset Requests", href: "/admin/requests", icon: Inbox, iconColor: "text-amber-500" },
        { label: "Gateway & QR Settings", href: "/admin/gateway", icon: Settings, iconColor: "text-cyan-500" },
      ],
    },
    {
      title: "Customer Management",
      icon: Users,
      color: "text-emerald-400",
      items: [
        { label: "Customers & Credits", href: "/users", icon: User },
      ],
    },
    {
      title: "Dataset Management",
      icon: Database,
      color: "text-purple-400",
      items: [
        { label: "Datasets Catalog", href: "/catalog", icon: Database },
        { label: "Live Scraper Console", href: "/scraper", icon: Search },
      ],
    },
    {
      title: "Payment Module",
      icon: CreditCard,
      color: "text-amber-400",
      items: [
        { label: "Payment Verification", href: "/admin/payments", icon: Coins, iconColor: "text-amber-500" },
        { label: "Upgrade Package", href: "/upgrade", icon: Zap, iconColor: "text-amber-500" },
      ],
    },
    {
      title: "Security Management",
      icon: Lock,
      color: "text-rose-400",
      items: [
        { label: "Security Module", href: "/security", icon: Shield, isDanger: true },
      ],
    },
  ];

  // ── Regular user nav ──
  const userGroups: NavGroup[] = [
    {
      title: "Main Navigation",
      icon: LayoutDashboard,
      color: "text-primary",
      items: [
        { label: "Datasets Catalog", href: "/catalog", icon: Database },
        { label: "Live Scraper Console", href: "/scraper", icon: Search },
        { label: "Marketing Portal", href: "/marketing", icon: Send },
        { label: "Upgrade Package", href: "/upgrade", icon: Zap, iconColor: "text-amber-500" },
      ],
    },
  ];

  const groups = isAdmin ? adminGroups : userGroups;

  // ── Single nav link ──
  const renderLink = (item: NavItem) => {
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all",
          isActive
            ? "bg-primary/10 text-primary font-semibold"
            : item.isDanger
            ? "text-rose-400 hover:bg-rose-500/10"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            item.iconColor,
            isActive && !item.iconColor && "text-primary"
          )}
        />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {isActive && !collapsed && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        )}
      </Link>
    );
  };

  // Wrap link in tooltip when collapsed
  const renderNavItem = (item: NavItem) => {
    const link = renderLink(item);
    if (!collapsed) return link;
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delay={0}>
      <div
        className={cn(
          "flex flex-col h-screen bg-card/60 backdrop-blur-xl border-r border-border/40 transition-[width] duration-300 overflow-hidden",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* ── Brand Header ── */}
        <div
          className={cn(
            "flex items-center shrink-0 border-b border-border/40",
            collapsed ? "justify-center p-3 h-14" : "justify-between px-4 h-14"
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger>
                <Link href="/catalog" className="flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{APP_NAME}</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link
                href="/catalog"
                className="flex items-center gap-2 font-bold text-sm tracking-tight hover:opacity-80 min-w-0"
              >
                <BarChart3 className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">{APP_NAME}</span>
              </Link>
              <div className="flex items-center gap-1 shrink-0">
                {isSuperadmin && (
                  <Badge className="bg-purple-600 text-[10px] px-1.5 py-0.5 font-bold">
                    SUPER
                  </Badge>
                )}
                {!isSuperadmin && isAdmin && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 font-bold">
                    ADMIN
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Nav Groups ── */}
        <div className="flex-1 overflow-y-auto py-2">
          {collapsed ? (
            // Icon-only mode: flat list with group dividers
            <div className="px-2 space-y-0.5">
              {groups.map((group) => (
                <div key={group.title} className="pb-2 mb-1 border-b border-border/20 last:border-b-0 space-y-0.5">
                  {group.items.map(renderNavItem)}
                </div>
              ))}
            </div>
          ) : (
            // Expanded mode: collapsible groups
            <div className="px-2 space-y-0.5">
              {groups.map((group) => {
                const GroupIcon = group.icon;
                const isOpen = openGroups[group.title] ?? true;

                return (
                  <Collapsible
                    key={group.title}
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.title)}
                  >
                    <CollapsibleTrigger
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                        "text-[11px] font-semibold uppercase tracking-wider",
                        "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <GroupIcon className={cn("h-3.5 w-3.5 shrink-0", group.color)} />
                        <span>{group.title}</span>
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      ) : (
                        <ChevronRight className="h-3 w-3 opacity-50" />
                      )}
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="pl-1 mt-0.5 space-y-0.5">
                        {group.items.map(renderNavItem)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className={cn(
            "shrink-0 border-t border-border/40 bg-card/80",
            collapsed ? "p-2 flex flex-col items-center gap-2" : "p-3 space-y-2"
          )}
        >
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    size="icon"
                    onClick={onOpenPaymentModal}
                    className="h-8 w-8 bg-amber-500 text-black hover:bg-amber-600"
                  >
                    <Coins className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user?.credits ?? 0} Credits — Buy More
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={logout}
                    className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLang}
                className="w-full text-xs h-8 gap-2 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
              >
                <Globe className="h-3.5 w-3.5" />
                {lang === "en" ? "🇧🇩 বাংলা ভাষা" : "🇺🇸 English"}
              </Button>

              <div
                className="text-xs text-muted-foreground truncate px-1"
                title={user?.email}
              >
                <User className="h-3 w-3 inline mr-1 opacity-60" />
                {user?.email}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={onOpenPaymentModal}
                  className="flex-1 text-xs h-8 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold hover:from-amber-600 hover:to-amber-700"
                >
                  <Coins className="h-3.5 w-3.5 mr-1" />
                  {user?.credits ?? 0} CR ➕ Buy
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8 text-muted-foreground hover:text-rose-400 shrink-0"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Main Exported Sidebar ────────────────────────────────────────
export function Sidebar({ onOpenPaymentModal }: SidebarProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Desktop: sticky sidebar with collapse toggle */}
      <div className="hidden lg:flex relative shrink-0">
        <aside className="sticky top-0 h-screen">
          <SidebarInner
            collapsed={collapsed}
            onOpenPaymentModal={onOpenPaymentModal}
          />
        </aside>

        {/* Collapse/Expand toggle button */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "absolute top-[52px] -right-3.5 z-50",
            "h-7 w-7 flex items-center justify-center rounded-full",
            "border border-border/60 bg-background text-muted-foreground shadow-md",
            "hover:text-foreground hover:border-primary/50 transition-all duration-200"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Mobile: hamburger button */}
      <div className="lg:hidden fixed top-3 left-3 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 bg-background/90 backdrop-blur border-border shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile: slide-in Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="p-0 w-72 max-w-[85vw] border-r border-border/40"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarInner
            collapsed={false}
            onClose={() => setMobileOpen(false)}
            onOpenPaymentModal={() => {
              setMobileOpen(false);
              onOpenPaymentModal?.();
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
