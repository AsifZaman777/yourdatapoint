"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Mail, Sparkles, Send, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMAIL_TEMPLATES, EMAIL_PALETTES } from "@/data/email-templates";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { Dataset, RecipientContact } from "@/lib/types";

interface EmailBuilderProps {
  recipientGroups: Dataset[];
  onOpenSelector: () => void;
  selectedContactsCount: number;
  totalContactsCount: number;
  groupContacts: RecipientContact[];
  selectedContactIds: Set<number>;
  onSelectGroup?: (groupName: string) => void;
}

export function EmailBuilder({
  recipientGroups,
  onOpenSelector,
  selectedContactsCount,
  totalContactsCount,
  groupContacts,
  selectedContactIds,
  onSelectGroup,
}: EmailBuilderProps) {
  const [recipientGroup, setRecipientGroup] = useState("");
  const [emailSubject, setEmailSubject] = useState("Special marketing offer!");
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [rawHtml, setRawHtml] = useState(EMAIL_TEMPLATES[0]?.html || "");

  // Parameters
  const [companyName, setCompanyName] = useState("MarketingOstad Promo");
  const [heading, setHeading] = useState("Save 25% Sitewide");
  const [promoCode, setPromoCode] = useState("SAVE25");
  const [ctaText, setCtaText] = useState("Get Started");
  const [ctaLink, setCtaLink] = useState("https://marketingostad.com");
  const [description, setDescription] = useState(
    "We discovered your details and wanted to offer our premium services."
  );

  const [previewHtml, setPreviewHtml] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPalette = EMAIL_PALETTES[paletteIndex] || EMAIL_PALETTES[0];

  // Resolve HTML template parameters and colors
  useEffect(() => {
    let rendered = rawHtml.replace(/{name}/g, "ABC Enterprise");

    if (currentPalette) {
      rendered = rendered
        .replace(/\[PRIMARY_COLOR\]/g, currentPalette.primary)
        .replace(/\[SECONDARY_COLOR\]/g, currentPalette.secondary)
        .replace(/\[BG_COLOR\]/g, currentPalette.bg)
        .replace(/\[TEXT_COLOR\]/g, currentPalette.text)
        .replace(/\[CARD_BG\]/g, currentPalette.cardBg)
        .replace(/\[BORDER_COLOR\]/g, currentPalette.borderColor);
    }

    rendered = rendered
      .replace(/\[COMPANY_NAME\]/g, companyName)
      .replace(/\[OFFER_HEADING\]/g, heading)
      .replace(/\[OFFER_CODE\]/g, promoCode)
      .replace(/\[CTA_TEXT\]/g, ctaText)
      .replace(/\[CTA_LINK\]/g, ctaLink)
      .replace(/\[OFFER_DESCRIPTION\]/g, description);

    setPreviewHtml(rendered);
  }, [
    rawHtml,
    currentPalette,
    companyName,
    heading,
    promoCode,
    ctaText,
    ctaLink,
    description,
  ]);

  const handleTemplateSelect = (valStr: string) => {
    const idx = parseInt(valStr);
    setSelectedTemplateIndex(idx);
    if (EMAIL_TEMPLATES[idx]) {
      setRawHtml(EMAIL_TEMPLATES[idx].html);
    }
  };

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);

  const handleStopCampaign = async () => {
    if (!activeCampaignId) return;
    try {
      await marketingApi.stopCampaign(activeCampaignId);
      toast.info(`Stop request sent for email campaign ${activeCampaignId}`);
      setIsCampaignRunning(false);
    } catch {
      toast.error("Failed to stop email campaign.");
    }
  };

  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!recipientGroup) {
      toast.warning("Please select a target lead group.");
      return;
    }

    const selectedList = groupContacts
      .filter((c) => selectedContactIds.has(c.id))
      .map((c) => ({ email: c.email, name: c.name }));

    setIsSubmitting(true);
    try {
      const res = await marketingApi.sendEmail({
        recipient_group: recipientGroup,
        subject: emailSubject,
        html_code: previewHtml,
        selected_contacts:
          selectedList.length > 0 && selectedList.length < groupContacts.length
            ? selectedList
            : null,
      });

      const cid = String(res.data.campaign_id || `email_camp_${Date.now()}`);
      setActiveCampaignId(cid);
      setIsCampaignRunning(true);
      toast.success(res.data.message || "Email campaign dispatched!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Email delivery failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiExport = (platform: string) => {
    const promptText = `Improve this HTML email template for:
Company: ${companyName}
Heading: ${heading}
Code: ${promoCode}
CTA: ${ctaText} (${ctaLink})
Details: ${description}

HTML:
\`\`\`html
${rawHtml}
\`\`\`
Return ONLY updated HTML code.`;

    navigator.clipboard.writeText(promptText).then(() => {
      toast.success(`HTML prompt copied! Opening ${platform}...`);
      setTimeout(() => {
        if (platform === "Gemini") window.open("https://gemini.google.com/app", "_blank");
        else if (platform === "ChatGPT") window.open("https://chatgpt.com", "_blank");
      }, 1000);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Form & Configuration */}
      <Card className="lg:col-span-6 glass-panel p-6 border-purple-500/30">
        <CardContent className="p-0 space-y-6">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Mail className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-foreground">AI Marketing Email Builder</h2>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-4">
            {/* Target Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Lead Group *</Label>
                <Select
                  value={recipientGroup}
                  onValueChange={(val) => {
                    const v = val || "";
                    setRecipientGroup(v);
                    onSelectGroup?.(v);
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="-- Target Group --" />
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
                  className="text-xs h-9 gap-1 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Inspect Leads ({selectedContactsCount}/{totalContactsCount})
                </Button>
              )}
            </div>

            {/* Email Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Email Subject Line *</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            {/* Template Selector & Palette Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">HTML Template Preset</Label>
                <Select value={selectedTemplateIndex.toString()} onValueChange={(val) => val && handleTemplateSelect(val)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TEMPLATES.map((tpl, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Color Palette Theme</Label>
                <Select value={paletteIndex.toString()} onValueChange={(v) => v && setPaletteIndex(parseInt(v))}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_PALETTES.map((pal, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        🎨 {pal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-card/60 border border-border/40">
              <div className="space-y-1">
                <Label className="text-[11px]">Brand Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Heading</Label>
                <Input value={heading} onChange={(e) => setHeading(e.target.value)} className="text-xs h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Promo Code</Label>
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
            </div>

            {/* AI Helper Export */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" /> Refine via AI:
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

            {/* Raw HTML Editor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Raw HTML Code</Label>
              <Textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>

            {isCampaignRunning && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-4 font-mono text-xs my-2">
                <div className="flex items-center gap-2 text-rose-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span>Email Campaign <strong className="text-foreground">{activeCampaignId}</strong> is Dispatching Live</span>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleStopCampaign}
                  className="h-8 gap-1.5 font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
                >
                  <Square className="h-3.5 w-3.5 fill-current" /> Stop Campaign
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-bold gap-2 py-5 bg-purple-600 text-white hover:bg-purple-700"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Dispatching Email Campaign..." : "Dispatch Bulk Email Campaign"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Right Column: Live HTML Preview Iframe */}
      <Card className="lg:col-span-6 glass-panel p-6 border-purple-500/30 flex flex-col">
        <CardContent className="p-0 space-y-4 flex-1 flex flex-col">
          <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
            Live HTML Template Preview:
          </div>

          <div className="flex-1 rounded-xl border border-border/50 bg-white overflow-hidden min-h-[450px]">
            <iframe
              srcDoc={previewHtml}
              title="Email Preview"
              className="w-full h-full border-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
