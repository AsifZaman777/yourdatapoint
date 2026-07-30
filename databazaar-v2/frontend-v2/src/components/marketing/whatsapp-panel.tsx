"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Send, RefreshCw, UserCheck, Play, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WHATSAPP_TEMPLATES } from "@/data/whatsapp-templates";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { Dataset, RecipientContact } from "@/lib/types";

interface WhatsAppPanelProps {
  recipientGroups: Dataset[];
  onOpenSelector: () => void;
  selectedContactsCount: number;
  totalContactsCount: number;
  groupContacts: RecipientContact[];
  selectedContactIds: Set<number>;
}

export function WhatsAppPanel({
  recipientGroups,
  onOpenSelector,
  selectedContactsCount,
  totalContactsCount,
  groupContacts,
  selectedContactIds,
}: WhatsAppPanelProps) {
  const [waStatus, setWaStatus] = useState("Checking...");
  const [recipientGroup, setRecipientGroup] = useState("");
  const [templateText, setTemplateText] = useState(
    WHATSAPP_TEMPLATES[0]?.text || ""
  );

  // Template parameters
  const [companyName, setCompanyName] = useState("MarketingOstad Promo");
  const [heading, setHeading] = useState("Save 25% Sitewide");
  const [promoCode, setPromoCode] = useState("SAVE25");
  const [ctaText, setCtaText] = useState("Get Started");
  const [ctaLink, setCtaLink] = useState("https://marketingostad.com");
  const [description, setDescription] = useState(
    "We discovered your details and wanted to offer our premium services."
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check WA status
  const checkStatus = () => {
    marketingApi
      .whatsappStatus()
      .then((res) => setWaStatus(res.data.session_active ? "Session Active" : "No Active Session"))
      .catch(() => setWaStatus("Error"));
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleScanQR = async () => {
    try {
      const res = await marketingApi.whatsappSetupSession();
      toast.info(res.data.message);
    } catch {
      toast.error("Failed to connect session scanner.");
    }
  };

  const handleResetSession = async () => {
    if (!confirm("Disconnect current WhatsApp session and scan a new account?")) return;
    try {
      const res = await marketingApi.whatsappResetSession();
      toast.info(res.data.message || "WhatsApp session reset.");
      checkStatus();
    } catch {
      toast.error("Failed to reset session.");
    }
  };

  const handleTemplateSelect = (idxStr: string) => {
    const idx = parseInt(idxStr);
    if (!isNaN(idx) && WHATSAPP_TEMPLATES[idx]) {
      setTemplateText(WHATSAPP_TEMPLATES[idx].text);
    }
  };

  const getResolvedMessage = () => {
    return templateText
      .replace(/\[COMPANY_NAME\]/g, companyName)
      .replace(/\[OFFER_HEADING\]/g, heading)
      .replace(/\[OFFER_CODE\]/g, promoCode)
      .replace(/\[CTA_TEXT\]/g, ctaText)
      .replace(/\[CTA_LINK\]/g, ctaLink)
      .replace(/\[OFFER_DESCRIPTION\]/g, description);
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
            <Button size="sm" variant="outline" onClick={handleResetSession} className="gap-1 text-xs h-8 text-destructive border-destructive/40">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          {/* Target Group Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Target Lead Group *</Label>
              <Select value={recipientGroup} onValueChange={(val) => setRecipientGroup(val || "")}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="-- Choose Recipient Group --" />
                </SelectTrigger>
                <SelectContent>
                  {recipientGroups.map((g) => (
                    <SelectItem key={g.id} value={`dataset_${g.id}`}>
                      {g.name} ({g.row_count} leads)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {recipientGroup && (
              <Button
                type="button"
                variant="outline"
                onClick={onOpenSelector}
                className="text-xs h-9 gap-1.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
              >
                Inspect / Select Leads ({selectedContactsCount}/{totalContactsCount})
              </Button>
            )}
          </div>

          {/* Preset Templates */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Pre-built Campaign Templates</Label>
            <Select onValueChange={(v) => typeof v === "string" && handleTemplateSelect(v)}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="-- Choose Template Preset --" />
              </SelectTrigger>
              <SelectContent>
                {WHATSAPP_TEMPLATES.map((tpl, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-card/60 border border-border/40">
            <div className="space-y-1">
              <Label className="text-[11px]">Brand Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Heading</Label>
              <Input value={heading} onChange={(e) => setHeading(e.target.value)} className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Coupon Code</Label>
              <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} className="text-xs h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">CTA Text</Label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="text-xs h-8" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[11px]">CTA Link</Label>
              <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="text-xs h-8" />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-[11px]">Offer Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs h-8" />
            </div>
          </div>

          {/* AI Helper Prompts */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Enhance via AI:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAiExport("ChatGPT")}
              className="text-[11px] h-7 px-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              ChatGPT
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAiExport("Gemini")}
              className="text-[11px] h-7 px-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              Gemini
            </Button>
          </div>

          {/* Textarea Template Editor */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Message Template Editor</Label>
            <Textarea
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={6}
              className="font-mono text-xs"
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-bold gap-2 py-5 bg-emerald-500 text-black hover:bg-emerald-600"
          >
            <Play className="h-4 w-4" />
            {isSubmitting ? "Launching WhatsApp Campaign..." : "Launch WhatsApp Campaign"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
