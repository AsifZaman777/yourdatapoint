"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Send,
  Mail,
  Square,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { Campaign } from "@/lib/types";

export function LiveCampaignTracker() {
  const router = useRouter();
  const pathname = usePathname();

  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | number | null>(null);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [targetCampaignId, setTargetCampaignId] = useState<string | number | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await marketingApi.activeCampaigns();
      const camps = res.data.active_campaigns || [];
      setActiveCampaigns(camps);
    } catch {
      // Ignore network hiccup during background polling
    }
  }, []);

  useEffect(() => {
    fetchActive();

    // Dynamically adjust polling frequency: 2.5s if campaigns active, 8s if idle
    const intervalTime = activeCampaigns.length > 0 ? 2500 : 8000;
    pollTimerRef.current = setInterval(fetchActive, intervalTime);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchActive, activeCampaigns.length]);

  const handleRequestStop = (campaignId: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTargetCampaignId(campaignId);
    setStopModalOpen(true);
  };

  const handleConfirmStop = async () => {
    if (!targetCampaignId) return;
    setStoppingId(targetCampaignId);
    try {
      await marketingApi.stopCampaign(targetCampaignId);
      toast.success("Campaign stopped immediately.");
      await fetchActive();
    } catch {
      toast.error("Failed to stop campaign.");
    } finally {
      setStoppingId(null);
      setStopModalOpen(false);
      setTargetCampaignId(null);
    }
  };

  const handleNavigateToConsole = () => {
    if (pathname !== "/marketing") {
      router.push("/marketing?tab=dashboard");
    }
  };

  if (activeCampaigns.length === 0) {
    return null;
  }

  // Primary active campaign to showcase
  const mainCampaign = activeCampaigns[0];
  const isWhatsApp = (mainCampaign.campaign_type || mainCampaign.type) === "whatsapp";
  const sent = mainCampaign.sent_count ?? mainCampaign.sent ?? 0;
  const total = mainCampaign.total_count ?? mainCampaign.total ?? Math.max(sent, 1);
  const percent = mainCampaign.progress_percent ?? (total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0);
  const estHuman = mainCampaign.est_human || "Calculating ETA...";
  const isStopping = mainCampaign.status === "stopping" || stoppingId === mainCampaign.id;

  // Minimized pill view
  if (isMinimized) {
    return (
      <aside aria-label="Live Marketing Campaign" className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-card/95 border border-emerald-500/40 shadow-2xl backdrop-blur-xl cursor-pointer hover:border-emerald-400 transition-all hover:scale-105"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>

          <div className="flex items-center gap-2 text-xs font-mono">
            {isWhatsApp ? (
              <Send className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Mail className="h-3.5 w-3.5 text-purple-400" />
            )}
            <span className="font-bold text-foreground">
              {sent}/{total}
            </span>
            <span className="text-muted-foreground">({percent}%)</span>
            <span className="text-cyan-400 hidden sm:inline">• {estHuman}</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="h-6 w-6 p-0 rounded-full hover:bg-muted"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </aside>
    );
  }

  // Expanded detailed floating dock
  return (
    <aside aria-label="Live Marketing Campaign" className="fixed bottom-5 right-5 z-50 w-[92vw] sm:w-[420px] max-w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl bg-card/95 border border-emerald-500/40 shadow-2xl backdrop-blur-2xl p-4 sm:p-5 space-y-3.5 text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={
                    isWhatsApp
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] uppercase font-bold py-0.5 px-2"
                      : "border-purple-500/40 text-purple-400 bg-purple-500/10 text-[10px] uppercase font-bold py-0.5 px-2"
                  }
                >
                  {isWhatsApp ? "WhatsApp Live" : "Email Live"}
                </Badge>
                <span className="text-xs font-bold truncate text-foreground">
                  {mainCampaign.recipient_group || "Target Leads"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="h-7 w-7 p-0 rounded-lg hover:bg-muted text-muted-foreground"
              title="Minimize to Pill"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress & Live Numbers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">
              Dispatched:{" "}
              <strong className="text-foreground text-sm font-bold">{sent}</strong> / {total}{" "}
              leads
            </span>
            <span className="text-emerald-400 font-bold text-sm">{percent}%</span>
          </div>

          {/* Animated Gradient Bar */}
          <div className="w-full h-2.5 bg-secondary/80 rounded-full overflow-hidden border border-border/40 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${Math.max(4, percent)}%` }}
            />
          </div>

          {/* EST / Estimated Time to Completion */}
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-300/90 pt-0.5">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>EST to Complete:</span>
            </span>
            <strong className="text-cyan-400 font-semibold">{estHuman}</strong>
          </div>
        </div>

        {/* Live log snippet */}
        {mainCampaign.latest_log && (
          <div className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-border/30 font-mono text-[11px] text-emerald-400/90 truncate flex items-center gap-1.5">
            <span className="text-cyan-400 shrink-0">&gt;</span>
            <span className="truncate">{mainCampaign.latest_log}</span>
          </div>
        )}

        {/* Multiple campaigns notice if > 1 */}
        {activeCampaigns.length > 1 && (
          <div className="text-[11px] text-muted-foreground text-right font-mono">
            +{activeCampaigns.length - 1} more campaign(s) running simultaneously
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleNavigateToConsole}
            className="flex-1 h-8 text-xs font-bold gap-1.5 bg-emerald-500 text-black hover:bg-emerald-400 shadow-md"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View in Console
          </Button>

          <Button
            size="sm"
            variant="destructive"
            disabled={isStopping}
            onClick={(e) => handleRequestStop(mainCampaign.id, e)}
            className="h-8 px-3 text-xs font-bold gap-1 bg-rose-600 hover:bg-rose-500 text-white shadow-md"
          >
            <Square className="h-3 w-3 fill-current" />
            {isStopping ? "Stopping..." : "Stop"}
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={stopModalOpen}
        onClose={() => setStopModalOpen(false)}
        onConfirm={handleConfirmStop}
        title="Stop Active Campaign?"
        description="Are you sure you want to stop this running campaign immediately? All further dispatches will halt right away."
        confirmText="Stop Campaign"
        isDanger
      />
    </aside>
  );
}
