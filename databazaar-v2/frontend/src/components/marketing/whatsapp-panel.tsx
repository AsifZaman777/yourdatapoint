"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Send, UserCheck, RefreshCw, Sparkles, Play, Square, Clock, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { WHATSAPP_TEMPLATES } from "@/data/whatsapp-templates";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import { scraperApi } from "@/lib/api/scraper";
import type { Dataset, RecipientContact, ScraperJob } from "@/lib/types";

interface WhatsAppPanelProps {
  recipientGroups: Dataset[];
  onOpenSelector: () => void;
  selectedContactsCount: number;
  totalContactsCount: number;
  groupContacts: RecipientContact[];
  selectedContactIds: Set<number>;
  onSelectGroup?: (groupName: string) => void;
  initialGroup?: string;
}

export function WhatsAppPanel({
  recipientGroups,
  onOpenSelector,
  selectedContactsCount,
  totalContactsCount,
  groupContacts,
  selectedContactIds,
  onSelectGroup,
  initialGroup,
}: WhatsAppPanelProps) {
  const [waStatus, setWaStatus] = useState<string>("Checking...");
  const [recipientGroup, setRecipientGroup] = useState<string>("");
  const [scrapedJobs, setScrapedJobs] = useState<ScraperJob[]>([]);
  const [templateText, setTemplateText] = useState<string>(WHATSAPP_TEMPLATES[0].text);
  const [companyName, setCompanyName] = useState("MarketingOstad");
  const [heading, setHeading] = useState("30% OFF Special B2B Deal");
  const [promoCode, setPromoCode] = useState("MO30OFF");
  const [ctaText, setCtaText] = useState("Claim Offer");
  const [ctaLink, setCtaLink] = useState("https://marketingostad.com");
  const [description, setDescription] = useState("Get high converting verified B2B leads across Bangladesh instantly.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  useEffect(() => {
    scraperApi
      .listJobs()
      .then((res) => {
        setScrapedJobs(res.data.filter((j) => (j.status === "done" || j.status === "stopped") && (j.result_count || 0) > 0));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialGroup && initialGroup !== recipientGroup) {
      setRecipientGroup(initialGroup);
      onSelectGroup?.(initialGroup);
      return;
    }
    if (!recipientGroup && recipientGroups.length > 0) {
      const firstVal = `dataset_${recipientGroups[0].id}`;
      setRecipientGroup(firstVal);
      onSelectGroup?.(firstVal);
    }
  }, [recipientGroups, recipientGroup, initialGroup, onSelectGroup]);

  const checkStatus = () => {
    marketingApi
      .whatsappStatus()
      .then((res) => {
        setWaStatus(res.data.session_active ? "Session Active" : "No Active Session");
      })
      .catch(() => setWaStatus("Disconnected"));
  };

  useEffect(() => {
    if (!recipientGroup && recipientGroups.length > 0) {
      const firstVal = `dataset_${recipientGroups[0].id}`;
      setRecipientGroup(firstVal);
      onSelectGroup?.(firstVal);
    }
  }, [recipientGroups, recipientGroup, onSelectGroup]);

  const handleScanQR = async () => {
    try {
      const res = await marketingApi.whatsappSetupSession();
      toast.info(res.data.message);
    } catch {
      toast.error("Failed to connect session scanner.");
    }
  };

  const confirmResetSession = async () => {
    try {
      const res = await marketingApi.whatsappResetSession();
      toast.info(res.data.message || "WhatsApp session reset.");
      checkStatus();
    } catch {
      toast.error("Failed to reset session.");
    }
  };

  const handleTemplateSelect = (idxStr: string | null) => {
    if (!idxStr) return;
    const idx = parseInt(idxStr);
    if (!isNaN(idx) && WHATSAPP_TEMPLATES[idx]) {
      setTemplateText(WHATSAPP_TEMPLATES[idx].text);
    }
  };

  const getResolvedMessage = () => {
    return templateText
      .replace(/\[COMPANY_NAME\]/g, companyName)
      .replace(/\[OFFER_HEADING\]/g, heading)
      .replace(/\[PROMO_CODE\]/g, promoCode)
      .replace(/\[CTA_TEXT\]/g, ctaText)
      .replace(/\[CTA_LINK\]/g, ctaLink)
      .replace(/\[OFFER_DESCRIPTION\]/g, description);
  };

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);
  const [liveCampaignDetails, setLiveCampaignDetails] = useState<{
    sent: number;
    total: number;
    pct: number;
    est_human: string;
    latest_log: string;
    status: string;
  } | null>(null);

  // Preserve & detect any ongoing running campaign on mount or across navigation
  useEffect(() => {
    const restoreActiveCampaign = async () => {
      try {
        const storedId =
          typeof window !== "undefined"
            ? sessionStorage.getItem("active_wa_campaign_id")
            : null;

        const res = await marketingApi.activeCampaigns();
        const waCamp = res.data.active_campaigns?.find(
          (c) => (c.campaign_type || c.type) === "whatsapp"
        );

        if (waCamp) {
          const cid = String(waCamp.id);
          setActiveCampaignId(cid);
          setIsCampaignRunning(true);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("active_wa_campaign_id", cid);
          }
          const sent = waCamp.sent_count ?? waCamp.sent ?? 0;
          const total = waCamp.total_count ?? waCamp.total ?? 1;
          const pct =
            waCamp.progress_percent ??
            (total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0);
          setLiveCampaignDetails({
            sent,
            total,
            pct,
            est_human: waCamp.est_human || "Calculating ETA...",
            latest_log: waCamp.latest_log || "Dispatching live in background...",
            status: waCamp.status,
          });
        } else if (storedId) {
          // If not in active running list, check if stored campaign finished/stopped
          try {
            const statusRes = await marketingApi.campaignStatus(storedId);
            const data = statusRes.data;
            const sent = data.sent || 0;
            const total = data.total || 1;
            const pct =
              data.progress_percent ??
              (total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0);
            const logs = data.logs || [];
            const latest =
              logs.length > 0
                ? typeof logs[logs.length - 1] === "string"
                  ? (logs[logs.length - 1] as string)
                  : (logs[logs.length - 1] as any).message || ""
                : "";

            setActiveCampaignId(storedId);
            const isStillActive =
              data.status === "running" || data.status === "stopping";
            setIsCampaignRunning(isStillActive);
            setLiveCampaignDetails({
              sent,
              total,
              pct,
              est_human:
                data.est_human ||
                (data.status === "done" ? "Completed" : data.status),
              latest_log: latest,
              status: data.status,
            });
          } catch {
            sessionStorage.removeItem("active_wa_campaign_id");
          }
        }
      } catch {
        // Ignore network hiccup
      }
    };

    restoreActiveCampaign();
  }, []);

  // Poll live campaign status while running
  useEffect(() => {
    if (!isCampaignRunning || !activeCampaignId) return;

    const interval = setInterval(async () => {
      try {
        const res = await marketingApi.campaignStatus(activeCampaignId);
        const data = res.data;
        const sent = data.sent || 0;
        const total = data.total || 1;
        const pct =
          data.progress_percent ??
          (total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0);
        const logs = data.logs || [];
        const latest =
          logs.length > 0
            ? typeof logs[logs.length - 1] === "string"
              ? (logs[logs.length - 1] as string)
              : (logs[logs.length - 1] as any).message || ""
            : "Dispatching live...";

        setLiveCampaignDetails({
          sent,
          total,
          pct,
          est_human: data.est_human || "Calculating ETA...",
          latest_log: latest,
          status: data.status,
        });

        if (
          data.status === "done" ||
          data.status === "failed" ||
          data.status === "stopped"
        ) {
          setIsCampaignRunning(false);
          if (data.status === "done")
            toast.success("WhatsApp campaign finished successfully!");
          else if (data.status === "stopped")
            toast.info("WhatsApp campaign stopped.");
          else toast.error("WhatsApp campaign ended or session dropped.");
        }
      } catch {
        // Retry next tick
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isCampaignRunning, activeCampaignId]);

  const confirmStopCampaign = async () => {
    if (!activeCampaignId) return;
    try {
      await marketingApi.stopCampaign(activeCampaignId);
      toast.success("WhatsApp campaign stopped immediately.");
      setIsCampaignRunning(false);
      setLiveCampaignDetails((prev) =>
        prev
          ? {
              ...prev,
              status: "stopped",
              latest_log: "Campaign stopped immediately by user request.",
            }
          : null
      );
    } catch {
      toast.error("Failed to stop campaign.");
    } finally {
      setStopConfirmOpen(false);
    }
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!recipientGroup) {
      toast.warning("Please choose a target recipient group.");
      return;
    }

    const selectedList = groupContacts
      .filter((c) => selectedContactIds.has(c.id))
      .map((c) => ({ phone: c.phone, name: c.name }));

    setIsSubmitting(true);
    try {
      const res = await marketingApi.sendWhatsapp({
        recipient_group: recipientGroup,
        message_template: getResolvedMessage(),
        selected_contacts:
          selectedList.length > 0 && selectedList.length < groupContacts.length
            ? selectedList
            : null,
      });

      const cid = String(res.data.campaign_id || `wa_camp_${Date.now()}`);
      setActiveCampaignId(cid);
      setIsCampaignRunning(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("active_wa_campaign_id", cid);
      }
      setLiveCampaignDetails({
        sent: 0,
        total: selectedList.length > 0 ? selectedList.length : (groupContacts.length || 1),
        pct: 0,
        est_human: "Initializing WhatsApp dispatch session...",
        latest_log: "Worker thread started...",
        status: "running",
      });
      toast.success("WhatsApp campaign launched!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Dispatch failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiExport = (platform: string) => {
    const promptText = `Improve this WhatsApp marketing message for:
Brand: ${companyName}
Heading: ${heading}
Code: ${promoCode}
CTA: ${ctaText} (${ctaLink})
Details: ${description}

Template:
\`\`\`
${templateText}
\`\`\`
Return ONLY updated template.`;

    navigator.clipboard.writeText(promptText).then(() => {
      toast.success(`Prompt copied to clipboard! Opening ${platform}...`);
      setTimeout(() => {
        if (platform === "Gemini") window.open("https://gemini.google.com/app", "_blank");
        else if (platform === "ChatGPT") window.open("https://chatgpt.com", "_blank");
      }, 1000);
    });
  };

  return (
    <Card className="glass-panel p-6 border-emerald-500/30">
      <CardContent className="p-0 space-y-6">
        {/* Header with WA status */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-foreground">WhatsApp Campaign Engine</h2>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                waStatus === "Session Active"
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  : "border-amber-500/40 text-amber-500 bg-amber-500/10"
              }
            >
              ● {waStatus}
            </Badge>

            <Button size="sm" variant="outline" onClick={handleScanQR} className="gap-1 text-xs h-8">
              <UserCheck className="h-3.5 w-3.5" /> Connect / Scan QR
            </Button>
            <Button size="sm" variant="outline" onClick={() => setResetConfirmOpen(true)} className="gap-1 text-xs h-8 text-destructive border-destructive/40">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          {/* Target Group Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Target Lead Group *</Label>
              <Select
                value={recipientGroup}
                onValueChange={(val) => {
                  const v = val || "";
                  setRecipientGroup(v);
                  onSelectGroup?.(v);
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="-- Choose Recipient Group --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel className="text-[11px] text-muted-foreground font-mono">Catalog Datasets</SelectLabel>
                    {recipientGroups.map((g) => (
                      <SelectItem key={g.id} value={`dataset_${g.id}`}>
                        {g.name} ({g.row_count} leads)
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {scrapedJobs.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[11px] text-cyan-400 font-mono">Private Scraped Datasets</SelectLabel>
                      {scrapedJobs.map((j) => (
                        <SelectItem key={j.id} value={`job_${j.id}`}>
                          Job #{j.id}: {j.query} ({j.result_count} leads)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            {recipientGroup && (
              <Button type="button" variant="outline" onClick={onOpenSelector} className="text-xs h-9 font-semibold">
                Inspect / Select Leads ({selectedContactsCount} / {totalContactsCount})
              </Button>
            )}
          </div>

          {/* Parameters Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Brand Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Heading</Label>
              <Input value={heading} onChange={(e) => setHeading(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Coupon Code</Label>
              <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTA Text</Label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTA Link</Label>
              <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Offer Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          {/* Template presets & AI Enhancers */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold">Pre-built Campaign Templates:</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="text-xs h-8 w-[200px]">
                  <SelectValue placeholder="Select preset template" />
                </SelectTrigger>
                <SelectContent>
                  {WHATSAPP_TEMPLATES.map((t, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Enhance via AI:</span>
              <Button type="button" size="sm" variant="outline" onClick={() => handleAiExport("ChatGPT")} className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-400">
                <Sparkles className="h-3 w-3" /> ChatGPT Prompt
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => handleAiExport("Gemini")} className="h-7 text-xs gap-1 border-cyan-500/40 text-cyan-400">
                <Sparkles className="h-3 w-3" /> Gemini Prompt
              </Button>
            </div>
          </div>

          {/* Message Editor */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Message Template Editor</Label>
            <textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-xl bg-black/90 border border-border/40 space-y-2">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Live Recipient Message Preview:
            </div>
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
              {getResolvedMessage()}
            </pre>
          </div>

          {/* Live Campaign Status Card (preserved across navigation and upon completion) */}
          {liveCampaignDetails && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 via-background/90 to-card border border-rose-500/40 shadow-xl space-y-3 font-mono text-xs animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-300">
                  {isCampaignRunning ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                    </span>
                  ) : liveCampaignDetails.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span>
                    WhatsApp Campaign <strong className="text-foreground">#{activeCampaignId}</strong>{" "}
                    {isCampaignRunning
                      ? "is Dispatching Live in Background"
                      : liveCampaignDetails.status === "done"
                      ? "Finished Successfully"
                      : `Status: ${liveCampaignDetails.status.toUpperCase()}`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {isCampaignRunning && liveCampaignDetails?.est_human && (
                    <div className="px-2.5 py-1 rounded-md bg-cyan-950/50 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span>EST: {liveCampaignDetails.est_human}</span>
                    </div>
                  )}

                  {isCampaignRunning ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setStopConfirmOpen(true)}
                      className="h-8 gap-1.5 font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
                    >
                      <Square className="h-3.5 w-3.5 fill-current" /> Stop Campaign
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLiveCampaignDetails(null);
                        setActiveCampaignId(null);
                        if (typeof window !== "undefined") {
                          sessionStorage.removeItem("active_wa_campaign_id");
                        }
                      }}
                      className="h-8 gap-1.5 font-bold text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Start New Campaign
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Dispatched:{" "}
                    <strong className="text-cyan-400 text-sm font-bold">
                      {liveCampaignDetails.sent}
                    </strong>{" "}
                    / {liveCampaignDetails.total} contacts
                  </span>
                  <span className="text-emerald-400 font-bold">{liveCampaignDetails.pct}%</span>
                </div>

                <div className="w-full h-2.5 bg-secondary/80 rounded-full overflow-hidden border border-border/40 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.max(4, liveCampaignDetails.pct)}%` }}
                  />
                </div>

                {liveCampaignDetails.latest_log && (
                  <div className="px-2.5 py-1.5 rounded-md bg-black/60 border border-border/30 text-[11px] text-emerald-400 truncate flex items-center gap-1.5">
                    <span className="text-cyan-400 shrink-0">&gt;</span>
                    <span className="truncate">{liveCampaignDetails.latest_log}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || isCampaignRunning}
            className="w-full font-bold gap-2 py-5 bg-emerald-500 text-black hover:bg-emerald-600 disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {isSubmitting
              ? "Launching WhatsApp Campaign..."
              : isCampaignRunning
              ? "Campaign Dispatching Live in Background (Multi-Page Protected)..."
              : "Launch WhatsApp Campaign"}
          </Button>
        </form>
      </CardContent>

      <ConfirmModal
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={confirmResetSession}
        title="Reset WhatsApp Session"
        description="Are you sure you want to disconnect the current WhatsApp session and scan a new account?"
        confirmText="Reset Session"
        isDanger
      />

      <ConfirmModal
        open={stopConfirmOpen}
        onClose={() => setStopConfirmOpen(false)}
        onConfirm={confirmStopCampaign}
        title="Stop WhatsApp Campaign?"
        description="Are you sure you want to terminate this WhatsApp campaign immediately? Sent messages cannot be recalled, but all remaining dispatches will halt right away."
        confirmText="Stop Campaign"
        isDanger
      />
    </Card>
  );
}
