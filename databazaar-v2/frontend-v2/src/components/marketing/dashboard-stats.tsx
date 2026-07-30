"use client";

import { Send, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats as StatsType } from "@/lib/types";

interface DashboardStatsProps {
  stats: StatsType | null;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const cards = [
    {
      title: "Total Campaigns Launched",
      value: stats?.total_campaigns ?? 0,
      icon: Layers,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      title: "Total Messages Dispatched",
      value: stats?.total_sent ?? 0,
      icon: Send,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Delivery Failures / Bounces",
      value: stats?.total_failed ?? 0,
      icon: AlertTriangle,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Campaign Delivery Rate",
      value:
        stats && stats.total_sent > 0
          ? `${(((stats.total_sent - stats.total_failed) / stats.total_sent) * 100).toFixed(1)}%`
          : "100%",
      icon: CheckCircle2,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <Card key={i} className="glass-panel border-border/40 p-6">
            <CardContent className="p-0 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium">{c.title}</div>
                <div className="text-2xl font-extrabold font-mono text-foreground">{c.value}</div>
              </div>
              <div className={`p-3 rounded-xl border ${c.bg} shrink-0`}>
                <Icon className={`h-5 w-5 ${c.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
