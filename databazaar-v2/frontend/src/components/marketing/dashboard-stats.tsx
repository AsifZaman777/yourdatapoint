"use client";

import { useState, useEffect } from "react";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Square,
  Play,
  Activity,
  PieChart as PieIcon,
  BarChart3,
  Terminal,
  RefreshCw,
  Zap,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { DashboardStats as StatsType } from "@/lib/types";

interface DashboardStatsProps {
  stats: StatsType | null;
  onRefresh?: () => void;
}

export function DashboardStats({ stats, onRefresh }: DashboardStatsProps) {
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [stoppingCampaignId, setStoppingCampaignId] = useState<string | number | null>(null);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [targetStopCampaignId, setTargetStopCampaignId] = useState<string | number | null>(null);

  const totalCampaigns = stats?.total_campaigns ?? 0;
  const totalSent = stats?.total_sent ?? 0;
  const totalContacts = stats?.total_contacts ?? Math.max(totalSent, 100);
  const totalFailed = stats?.total_failed ?? 0;
  const totalRemaining = Math.max(0, totalContacts - totalSent - totalFailed);

  const progressPercentage =
    totalContacts > 0 ? Math.min(100, Math.round((totalSent / totalContacts) * 100)) : 0;

  const waCount = stats?.whatsapp_count ?? 0;
  const emailCount = stats?.email_count ?? 0;
  const activeCount = stats?.active_count ?? 0;

  // Pie Chart Segment Data
  const pieSegments = [
    { label: "Sent / Dispatched", value: totalSent, color: "#10b981", percent: totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 100 },
    { label: "Pending / In-Progress", value: totalRemaining, color: "#06b6d4", percent: totalContacts > 0 ? Math.round((totalRemaining / totalContacts) * 100) : 0 },
    { label: "Failed / Bounced", value: totalFailed, color: "#f43f5e", percent: totalContacts > 0 ? Math.round((totalFailed / totalContacts) * 100) : 0 },
  ];

  // Auto poll logs & live stats whenever campaigns are active
  useEffect(() => {
    const runningCamps = stats?.campaigns?.filter((c) => c.status === "running" || c.status === "stopping") || [];
    if (runningCamps.length > 0) {
      const campId = runningCamps[0].id;
      marketingApi
        .campaignStatus(campId)
        .then((res) => {
          if (res.data && res.data.logs) {
            const formattedLogs = res.data.logs.map((l: any) =>
              typeof l === "string"
                ? l
                : `[${l.timestamp || ""}] ${l.name || ""} (${l.phone || l.email || ""}) — ${l.status || ""}`
            );
            setActiveLogs(formattedLogs.slice(-15).reverse());
          }
        })
        .catch(() => {});

      const pollTimer = setInterval(() => {
        if (onRefresh) onRefresh();
      }, 2500);

      return () => clearInterval(pollTimer);
    }
  }, [stats, onRefresh]);

  const handleRequestStopCampaign = (campaignId: string | number) => {
    setTargetStopCampaignId(campaignId);
    setStopModalOpen(true);
  };

  const confirmStopCampaign = async () => {
    if (!targetStopCampaignId) return;
    setStoppingCampaignId(targetStopCampaignId);
    try {
      await marketingApi.stopCampaign(targetStopCampaignId);
      toast.success("Campaign stopped immediately.");
      if (onRefresh) onRefresh();
    } catch {
      toast.error("Failed to stop campaign.");
    } finally {
      setStoppingCampaignId(null);
      setStopModalOpen(false);
      setTargetStopCampaignId(null);
    }
  };

  const cards = [
    {
      title: "Total Campaigns Launched",
      value: totalCampaigns,
      icon: Layers,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      title: "Total Messages Dispatched",
      value: totalSent,
      icon: Send,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Delivery Failures / Bounces",
      value: totalFailed,
      icon: AlertTriangle,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      title: "Campaign Success Rate",
      value: `${stats?.success_rate ?? 100}%`,
      icon: CheckCircle2,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Card key={i} className="glass-panel border-border/40 p-5">
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

      {/* Total Campaign Progress & Live Control Banner */}
      <Card className="glass-panel border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 via-background to-cyan-950/10 p-6">
        <CardHeader className="p-0 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Zap className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Overall Campaign Progress & Dispatch Controller</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Live real-time message dispatch ratio across all active and completed marketing campaigns
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeCount > 0 ? (
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse gap-1.5 py-1 px-3">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  {activeCount} Campaign(s) Dispatching Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 bg-emerald-500/10 gap-1.5 py-1 px-3">
                  <CheckCircle2 className="h-3.5 w-3.5" /> All Dispatches Complete
                </Badge>
              )}

              {onRefresh && (
                <Button size="sm" variant="outline" onClick={onRefresh} className="h-8 text-xs gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          {/* Real-time Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-medium">
              <span>
                Total Dispatched: <strong className="text-cyan-400 text-sm">{totalSent}</strong> / {totalContacts} Leads
              </span>
              <span className="text-cyan-400 font-bold">{progressPercentage}% Completed</span>
            </div>

            <div className="w-full h-3 bg-secondary/80 rounded-full overflow-hidden border border-border/40 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Active Running Campaigns Live Monitor Command Center */}
          {stats?.campaigns && stats.campaigns.filter((c) => c.status === "running" || c.status === "stopping").length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 via-background/90 to-card border border-rose-500/40 shadow-xl space-y-3.5 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-rose-300">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                  <span>Active Running Campaigns ({stats.campaigns.filter((c) => c.status === "running" || c.status === "stopping").length})</span>
                </span>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <Activity className="h-3 w-3 animate-pulse" /> Live Real-Time Dispatch Stream
                </span>
              </div>

              {stats.campaigns
                .filter((c) => c.status === "running" || c.status === "stopping")
                .map((c) => {
                  const isWa = (c.campaign_type || c.type) === "whatsapp";
                  const sentCnt = c.sent_count ?? c.sent ?? 0;
                  const totalCnt = c.total_count ?? c.total ?? 1;
                  const pct = c.progress_percent ?? (totalCnt > 0 ? Math.min(100, Math.round((sentCnt / totalCnt) * 100)) : 0);
                  const isStop = c.status === "stopping" || stoppingCampaignId === c.id;

                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-card/80 border border-rose-500/30 hover:border-rose-400/50 transition-all space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={
                                isWa
                                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-bold uppercase"
                                  : "border-purple-500/40 text-purple-400 bg-purple-500/10 text-[10px] font-bold uppercase"
                              }
                            >
                              {isWa ? "WhatsApp" : "Email"}
                            </Badge>
                            <span className="font-bold text-foreground text-sm">
                              {c.recipient_group}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{c.id}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground font-mono flex items-center gap-3 flex-wrap pt-0.5">
                            <span>
                              Dispatched:{" "}
                              <strong className="text-cyan-400 text-sm font-bold">{sentCnt}</strong> / {totalCnt} leads
                            </span>
                            <span className="text-emerald-400 font-bold">({pct}%)</span>
                            {c.failed_count !== undefined && c.failed_count > 0 && (
                              <span className="text-rose-400 font-medium">
                                ({c.failed_count} unreachable/failed)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* EST to complete box & Stop Button */}
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 font-mono text-right">
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                              <Clock className="h-3 w-3 text-cyan-400" /> EST to Complete:
                            </div>
                            <div className="text-xs font-extrabold text-cyan-300">
                              {c.est_human || "Calculating..."}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isStop}
                            onClick={() => handleRequestStopCampaign(c.id)}
                            className="h-9 px-3 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-lg shrink-0"
                          >
                            <Square className="h-3.5 w-3.5 fill-current" />
                            {isStop ? "Stopping..." : "Stop Campaign"}
                          </Button>
                        </div>
                      </div>

                      {/* Mini animated progress bar */}
                      <div className="w-full h-2 bg-secondary/80 rounded-full overflow-hidden border border-border/40 p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>

                      {/* Latest log snippet */}
                      {c.latest_log && (
                        <div className="px-2.5 py-1.5 rounded-md bg-black/60 border border-border/30 font-mono text-[11px] text-emerald-400 truncate flex items-center gap-1.5">
                          <span className="text-cyan-400 shrink-0">&gt;</span>
                          <span className="truncate">{c.latest_log}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Charts Grid (Pie Chart + Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Live Segment Pie / Donut Chart */}
        <Card className="glass-panel border-border/40 p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4 border-b border-border/30 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-cyan-400" />
              <CardTitle className="text-sm font-bold">Live Lead Delivery Breakdown (Pie Chart)</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Total {totalContacts} Targets
            </Badge>
          </CardHeader>

          <CardContent className="p-0 pt-4 flex flex-col sm:flex-row items-center justify-around gap-6 flex-1">
            {/* SVG Donut Chart */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3.8" />

                {/* Segment 1: Sent (emerald) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.8"
                  strokeDasharray={`${pieSegments[0].percent} ${100 - pieSegments[0].percent}`}
                  strokeDashoffset="0"
                  className="transition-all duration-700"
                />

                {/* Segment 2: Remaining (cyan) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3.8"
                  strokeDasharray={`${pieSegments[1].percent} ${100 - pieSegments[1].percent}`}
                  strokeDashoffset={`-${pieSegments[0].percent}`}
                  className="transition-all duration-700"
                />

                {/* Segment 3: Failed (rose) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3.8"
                  strokeDasharray={`${pieSegments[2].percent} ${100 - pieSegments[2].percent}`}
                  strokeDashoffset={`-${pieSegments[0].percent + pieSegments[1].percent}`}
                  className="transition-all duration-700"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold font-mono text-cyan-400">{progressPercentage}%</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">Dispatched</span>
              </div>
            </div>

            {/* Pie Chart Legend */}
            <div className="space-y-3 flex-1 w-full">
              {pieSegments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/40 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="font-medium text-foreground">{seg.label}</span>
                  </div>
                  <div className="font-mono text-right">
                    <strong className="text-foreground">{seg.value}</strong>
                    <span className="text-muted-foreground ml-1.5 text-[11px]">({seg.percent}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Channel & Status Comparison Bar Chart */}
        <Card className="glass-panel border-border/40 p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-4 border-b border-border/30 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              <CardTitle className="text-sm font-bold">Channel Dispatch Comparison (Bar Chart)</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              WhatsApp vs Email
            </Badge>
          </CardHeader>

          <CardContent className="p-0 pt-4 space-y-5 flex-1 flex flex-col justify-center">
            {/* Bar 1: WhatsApp Channel */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Send className="h-3.5 w-3.5" /> WhatsApp Automation Engine
                </span>
                <span className="font-mono text-muted-foreground">{waCount} Campaigns Launched</span>
              </div>
              <div className="w-full h-4 bg-secondary/80 rounded-full overflow-hidden border border-border/40 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${totalCampaigns > 0 ? Math.round((waCount / totalCampaigns) * 100) : 50}%` }}
                />
              </div>
            </div>

            {/* Bar 2: Email Channel */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <Zap className="h-3.5 w-3.5" /> HTML Email Marketing Engine
                </span>
                <span className="font-mono text-muted-foreground">{emailCount} Campaigns Dispatched</span>
              </div>
              <div className="w-full h-4 bg-secondary/80 rounded-full overflow-hidden border border-border/40 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500"
                  style={{ width: `${totalCampaigns > 0 ? Math.round((emailCount / totalCampaigns) * 100) : 50}%` }}
                />
              </div>
            </div>

            {/* Bar 3: Success Rate Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Overall Delivery Efficiency Rate
                </span>
                <span className="font-mono text-cyan-400">{stats?.success_rate ?? 100}%</span>
              </div>
              <div className="w-full h-4 bg-secondary/80 rounded-full overflow-hidden border border-border/40 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${stats?.success_rate ?? 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Real-Time Activity Log Stream directly on Overview */}
      <Card className="glass-panel border-border/40 p-5">
        <CardHeader className="p-0 pb-3 flex-row items-center justify-between border-b border-border/30">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-bold">Live System Activity & Dispatch Stream</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/40 bg-cyan-500/10">
            Real-Time Stream Active
          </Badge>
        </CardHeader>

        <CardContent className="p-0 pt-3">
          <div className="bg-black/80 rounded-xl p-4 border border-border/40 font-mono text-xs text-emerald-400 space-y-1.5 max-h-[200px] overflow-y-auto">
            {activeLogs.length > 0 ? (
              activeLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-cyan-500 select-none">&gt;</span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-center py-4 font-sans text-xs">
                No active campaign dispatches currently streaming. Select WhatsApp or Email tab to launch.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={stopModalOpen}
        onClose={() => setStopModalOpen(false)}
        onConfirm={confirmStopCampaign}
        title="Stop Active Campaign?"
        description="Are you sure you want to stop this running campaign immediately? All further dispatches will halt right away."
        confirmText="Stop Campaign"
        isDanger
      />
    </div>
  );
}
