import { useState, useEffect, type FormEvent } from "react";
import { Mail, Sparkles, Send, Square, ShieldCheck, AlertCircle, Clock, Building, Globe, MapPin, Phone, ExternalLink, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMAIL_TEMPLATES, EMAIL_PALETTES } from "@/data/email-templates";
import { marketingApi } from "@/lib/api/marketing";
import { useAuth } from "@/providers/auth-provider";
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
  const { isAdmin } = useAuth();
  const [brevoInfo, setBrevoInfo] = useState<{
    status: "none" | "pending" | "pending_email_verification" | "approved" | "rejected";
    api_key?: string;
    daily_limit: number;
    today_sent: number;
    application?: any;
  } | null>(null);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [bizName, setBizName] = useState("");
  const [bizDomain, setBizDomain] = useState("");
  const [bizLocation, setBizLocation] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizSocial, setBizSocial] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const loadBrevoStatus = () => {
    marketingApi
      .brevoStatus()
      .then((res) => setBrevoInfo(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadBrevoStatus();
  }, []);

  const handleApplyBrevo = async (e: FormEvent) => {
    e.preventDefault();
    if (!bizName || !bizDomain || !bizPhone) {
      toast.warning("Please fill in required business verification fields.");
      return;
    }
    setIsApplying(true);
    try {
      await marketingApi.brevoApply({
        business_name: bizName,
        domain_name: bizDomain,
        location: bizLocation,
        business_phone: bizPhone,
        social_media_website: bizSocial,
      });
      toast.success("Business verification request submitted to Super Admin!");
      setVerifyModalOpen(false);
      loadBrevoStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Submission failed.");
    } finally {
      setIsApplying(false);
    }
  };

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

    if (!isAdmin && brevoInfo?.status !== "approved") {
      toast.error("Brevo business verification is required before sending emails.");
      setVerifyModalOpen(true);
      return;
    }

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
      loadBrevoStatus();
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

  const isApproved = isAdmin || (brevoInfo && brevoInfo.status === "approved");
  const isPending = !isAdmin && brevoInfo && brevoInfo.status === "pending";
  const isEmailVerificationPending = !isAdmin && brevoInfo && brevoInfo.status === "pending_email_verification";
  const isEmailVerified = !isAdmin && brevoInfo && brevoInfo.status === "email_verified";

  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleConfirmEmailVerification = async () => {
    setIsVerifyingEmail(true);
    try {
      const res = await marketingApi.checkBrevoVerification();
      if (res.data.success) {
        toast.success(res.data.message || "Email verification confirmed!");
        loadBrevoStatus();
      }
    } catch {
      toast.error("Could not verify email status. Please check your inbox.");
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleResendEmailLink = async () => {
    setIsResending(true);
    try {
      const res = await marketingApi.resendBrevoVerification();
      toast.success(res.data.message || "Verification email re-sent!");
    } catch {
      toast.error("Failed to re-send verification link.");
    } finally {
      setIsResending(false);
    }
  };

  const [customerApiKeyInput, setCustomerApiKeyInput] = useState("");
  const [isSubmittingCustomerKey, setIsSubmittingCustomerKey] = useState(false);
  const [activationUrlInput, setActivationUrlInput] = useState("");
  const [isActivatingUrl, setIsActivatingUrl] = useState(false);

  const handleTriggerActivationLink = async () => {
    if (!activationUrlInput.trim() || !activationUrlInput.includes("brevo.com")) {
      toast.warning("Please enter a valid Brevo activation link from your email.");
      return;
    }
    setIsActivatingUrl(true);
    try {
      const res = await marketingApi.activateBrevoLink(activationUrlInput.trim());
      toast.success(res.data.message || "Brevo activation link processed!");
      loadBrevoStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to process Brevo activation link.");
    } finally {
      setIsActivatingUrl(false);
    }
  };

  const handleSaveCustomerApiKey = async () => {
    if (!customerApiKeyInput.trim() || !customerApiKeyInput.startsWith("xkeysib-")) {
      toast.warning("Please enter a valid Brevo API Key starting with 'xkeysib-'.");
      return;
    }
    setIsSubmittingCustomerKey(true);
    try {
      await marketingApi.checkBrevoVerification();
      toast.success("Brevo API Key linked successfully! Email campaign portal unlocked.");
      loadBrevoStatus();
    } catch {
      toast.error("Failed to link Brevo API Key. Please try again.");
    } finally {
      setIsSubmittingCustomerKey(false);
    }
  };

  if (!isApproved) {
    return (
      <div className="space-y-6">
        <Card className="glass-panel border-purple-500/40 bg-card/90 p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden my-2">
          {/* Ambient background glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
              {isEmailVerified ? (
                <ShieldCheck className="h-7 w-7 text-emerald-400 animate-pulse" />
              ) : isEmailVerificationPending ? (
                <Mail className="h-7 w-7 animate-bounce text-purple-400" />
              ) : (
                <Lock className="h-7 w-7 animate-pulse" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                {isEmailVerified
                  ? "Brevo Email Verified!"
                  : isEmailVerificationPending
                  ? "Brevo Activation Email Sent!"
                  : isPending
                  ? "Brevo Verification Pending Admin Review"
                  : "Brevo Account Required for Email Campaigns"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {isEmailVerified
                  ? "Your Brevo email verification is confirmed. Superadmin will now configure and paste your Brevo API Key in Customer Management to complete activation."
                  : isEmailVerificationPending
                  ? "Brevo sent a confirmation email to your address. Please open your email inbox, click Brevo's activation link, then click below to complete setup."
                  : isPending
                  ? "Your business details have been submitted and are currently under review by an Administrator. Once approved, your Brevo API key will unlock email marketing."
                  : "To send bulk email marketing campaigns, please submit your business details. Admins will verify your domain and issue your Brevo API key & daily email limits."}
              </p>
            </div>

            {isEmailVerified ? (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono text-xs px-4 py-2 gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Email Verified — Awaiting Admin API Key Link
              </Badge>
            ) : isEmailVerificationPending ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 text-left text-xs space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <Mail className="h-4 w-4 text-purple-400" /> Customer Action Required: Confirm Email Link from Brevo
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Brevo has sent a confirmation email directly to your inbox. Open your email, click <strong>Confirm my email</strong>, then return here to unlock your campaign panel.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={handleConfirmEmailVerification}
                    disabled={isVerifyingEmail}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-5 rounded-xl shadow-lg shadow-emerald-500/20 gap-2"
                  >
                    <ShieldCheck className="h-4.5 w-4.5" />
                    {isVerifyingEmail ? "Verifying Activation..." : "I Have Clicked & Confirmed My Brevo Email"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleResendEmailLink}
                    disabled={isResending}
                    className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 font-bold text-xs h-11 px-4"
                  >
                    Resend Email Link
                  </Button>
                </div>

                {/* Option to paste Brevo Activation Link directly */}
                <div className="pt-3 border-t border-border/30 text-left space-y-2">
                  <Label className="text-[11px] font-semibold text-purple-300">
                    Option A: Paste Brevo Activation Link from your Email Inbox:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="https://onboarding-api.brevo.com/account/activate/..."
                      value={activationUrlInput}
                      onChange={(e) => setActivationUrlInput(e.target.value)}
                      className="text-xs font-mono h-9 bg-background/50"
                    />
                    <Button
                      onClick={handleTriggerActivationLink}
                      disabled={isActivatingUrl}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-4 shrink-0 gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {isActivatingUrl ? "Activating..." : "Submit & Verify"}
                    </Button>
                  </div>
                </div>

                {/* Option to paste Brevo API Key */}
                <div className="pt-2 text-left space-y-2">
                  <Label className="text-[11px] text-muted-foreground">
                    Option B: Or paste your Brevo API Key (xkeysib-...) if generated:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="xkeysib-..."
                      value={customerApiKeyInput}
                      onChange={(e) => setCustomerApiKeyInput(e.target.value)}
                      className="text-xs font-mono h-9 bg-background/50"
                    />
                    <Button
                      onClick={handleSaveCustomerApiKey}
                      disabled={isSubmittingCustomerKey}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 px-4 shrink-0"
                    >
                      Link & Unlock
                    </Button>
                  </div>
                </div>
              </div>
            ) : !isPending ? (
              <Button
                onClick={() => setVerifyModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-8 py-5 rounded-xl shadow-xl shadow-purple-500/25 gap-2 hover:scale-[1.02] transition-all"
              >
                <ShieldCheck className="h-5 w-5" /> Apply for Brevo Account
              </Button>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-mono text-xs px-4 py-2 gap-2">
                <Clock className="h-4 w-4 animate-spin" /> Status: Pending Admin Review
              </Badge>
            )}
          </div>
        </Card>

        {/* Brevo Business Verification Request Dialog */}
        <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
          <DialogContent className="sm:max-w-md bg-card border-purple-500/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-400">
                <Building className="h-5 w-5" /> Brevo Business Verification Request
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Please submit your official business information. Admins will review your details, link your Brevo credentials, and enable daily email dispatches.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleApplyBrevo} className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Registered Business Name *</Label>
                <Input
                  placeholder="e.g. Acme Tech Ltd"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  required
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Official Business Domain *</Label>
                <Input
                  placeholder="e.g. acmetech.com"
                  value={bizDomain}
                  onChange={(e) => setBizDomain(e.target.value)}
                  required
                  className="text-xs h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Location / Office *</Label>
                  <Input
                    placeholder="e.g. Dhaka, Bangladesh"
                    value={bizLocation}
                    onChange={(e) => setBizLocation(e.target.value)}
                    required
                    className="text-xs h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Business Phone *</Label>
                  <Input
                    placeholder="e.g. +8801700000000"
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    required
                    className="text-xs h-8"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Business Verification Info *</Label>
                <Input
                  placeholder="e.g. https://facebook.com/acmetech or website URL"
                  value={bizSocial}
                  onChange={(e) => setBizSocial(e.target.value)}
                  required
                  className="text-xs h-8"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="ghost" onClick={() => setVerifyModalOpen(false)} className="text-xs h-8">
                  Cancel
                </Button>
                <Button type="submit" disabled={isApplying} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold h-8">
                  {isApplying ? "Submitting Request..." : "Submit Verification Request"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Configuration */}
        <Card className="lg:col-span-6 glass-panel p-6 border-purple-500/30">
          <CardContent className="p-0 space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-bold text-foreground">AI Marketing Email Builder</h2>
              </div>
              {brevoInfo && isApproved && (
                <Badge variant="outline" className="border-purple-500/40 text-purple-400 text-[11px] font-mono gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Today: {brevoInfo.today_sent} / {brevoInfo.daily_limit} Limit
                </Badge>
              )}
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
    </div>
  );
}
