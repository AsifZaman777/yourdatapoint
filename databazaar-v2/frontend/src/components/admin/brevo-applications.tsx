"use client";

import { useState, useEffect } from "react";
import { Building, ShieldCheck, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { BrevoApplication } from "@/lib/types";

export function BrevoApplicationsList() {
  const [applications, setApplications] = useState<BrevoApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval Modal State
  const [approveTarget, setApproveTarget] = useState<BrevoApplication | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [dailyLimit, setDailyLimit] = useState<number>(300);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);

  // Rejection Modal State
  const [rejectTarget, setRejectTarget] = useState<BrevoApplication | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const loadApplications = () => {
    setLoading(true);
    marketingApi
      .listBrevoApplications()
      .then((res) => setApplications(res.data))
      .catch(() => toast.error("Failed to load Brevo applications."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const [targetStatus, setTargetStatus] = useState<string>("approved");

  const handleOpenApprove = (app: BrevoApplication) => {
    setApproveTarget(app);
    setApiKey(app.assigned_api_key || app.user_email ? `xkeysib-${Math.random().toString(36).substring(2, 12)}` : "");
    setDailyLimit(app.daily_limit || 300);
    setTargetStatus("approved");
  };

  const handleConfirmApprove = async () => {
    if (!approveTarget) return;
    if (targetStatus === "approved" && !apiKey.trim()) {
      toast.warning("Please enter a valid Brevo API Key to mark as Approved.");
      return;
    }
    setIsSubmittingApprove(true);
    try {
      await marketingApi.approveBrevoApplication(approveTarget.id, {
        api_key: apiKey.trim(),
        daily_limit: Number(dailyLimit) || 300,
        account_status: targetStatus,
      });
      const msg = targetStatus === "pending_email_verification"
        ? `Initiated Brevo registration! Awaiting customer email confirmation for ${approveTarget.user_email}.`
        : `Approved Brevo account for ${approveTarget.user_email}!`;
      toast.success(msg);
      setApproveTarget(null);
      loadApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Approval failed.");
    } finally {
      setIsSubmittingApprove(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      toast.warning("Please enter a reason for rejecting this application.");
      return;
    }
    setIsSubmittingReject(true);
    try {
      await marketingApi.rejectBrevoApplication(rejectTarget.id, {
        reason: rejectReason.trim(),
      });
      toast.success(`Application rejected for ${rejectTarget.user_email}.`);
      setRejectTarget(null);
      loadApplications();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Rejection failed.");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleUnapproveUser = async (userId: number, userEmail?: string) => {
    try {
      await marketingApi.unapproveUserBrevo(userId);
      toast.success(`Revoked Brevo approval for ${userEmail || `User #${userId}`}. Email panel locked.`);
      loadApplications();
    } catch {
      toast.error("Failed to revoke Brevo approval.");
    }
  };

  return (
    <Card className="glass-panel p-6 border-purple-500/30">
      <CardContent className="p-0 space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-bold text-foreground">Brevo Business Verification & API Approvals</h3>
          </div>
          <Badge variant="outline" className="border-purple-500/40 text-purple-300 font-mono text-xs">
            Submissions: {applications.length}
          </Badge>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-xl border border-border/40 bg-card/50 space-y-3 hover:border-purple-500/30 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/20 pb-2">
                <div>
                  <span className="font-bold text-sm text-foreground">{app.business_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({app.user_email || `User #${app.user_id}`})</span>
                </div>
                <div className="flex items-center gap-2">
                  {app.status === "pending" && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 gap-1 text-[11px]">
                      <Clock className="h-3 w-3 animate-spin" /> Pending Review
                    </Badge>
                  )}
                  {app.status === "approved" && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 gap-1 text-[11px]">
                      <CheckCircle2 className="h-3 w-3" /> Approved ({app.daily_limit || 300}/day)
                    </Badge>
                  )}
                  {app.status === "rejected" && (
                    <Badge variant="outline" className="border-rose-500/40 text-rose-400 gap-1 text-[11px]">
                      <XCircle className="h-3 w-3" /> Rejected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Business Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Domain:</span>
                  <span className="text-purple-300 font-bold">{app.domain_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Phone:</span>
                  <span className="text-foreground">{app.business_phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Location:</span>
                  <span className="text-foreground">{app.location}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Submitted:</span>
                  <span className="text-muted-foreground">{app.created_at ? app.created_at.split("T")[0] : ""}</span>
                </div>
              </div>

              {/* Verification Handle / Social Link */}
              <div className="text-xs bg-background/60 p-2.5 rounded-lg border border-border/30 flex items-center justify-between">
                <span className="text-muted-foreground font-mono text-[11px]">
                  Verification Handle/Website: <strong className="text-cyan-400">{app.social_media_website}</strong>
                </span>
                {app.social_media_website.startsWith("http") && (
                  <a
                    href={app.social_media_website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-[11px] font-bold shrink-0"
                  >
                    Inspect <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Assigned API Key preview if approved */}
              {app.status === "approved" && app.assigned_api_key && (
                <div className="text-xs text-emerald-400 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/30 flex items-center justify-between font-mono">
                  <span>Linked Brevo API Key: <strong>{app.assigned_api_key}</strong></span>
                  <span>Limit: {app.daily_limit} emails/day</span>
                </div>
              )}

              {/* Actions for Pending or Editing */}
              <div className="flex justify-end gap-2 pt-1">
                {app.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectTarget(app)}
                      className="h-8 text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                    >
                      Reject Application
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenApprove(app)}
                      className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Initiate Brevo Account
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnapproveUser(app.user_id, app.user_email)}
                      className="h-8 text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10 gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Unapprove / Lock Access
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenApprove(app)}
                      className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Configure / Link API Key
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {applications.length === 0 && !loading && (
            <div className="text-center py-12 text-xs text-muted-foreground italic">
              No Brevo business verification applications submitted yet.
            </div>
          )}
        </div>
      </CardContent>

      {/* Approval / Registration Modal */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md bg-card border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <ShieldCheck className="h-5 w-5" />
              {targetStatus === "pending_email_verification"
                ? `Initiate Brevo Registration (${approveTarget?.business_name})`
                : `Configure Brevo Credentials (${approveTarget?.business_name})`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {targetStatus === "pending_email_verification"
                ? `Open Brevo account for ${approveTarget?.user_email}. Brevo will send the confirmation email directly to the customer's inbox.`
                : `Paste the customer's Brevo API Key (xkeysib-...) and set the daily dispatch limit.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Account Activation Mode</Label>
              <Select value={targetStatus} onValueChange={(val) => val && setTargetStatus(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_email_verification">1. Initiate Account Signup (Await Customer Email Verification)</SelectItem>
                  <SelectItem value="approved">2. Link API Key & Unlock (Fully Approved)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetStatus === "pending_email_verification" && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300">Customer Email:</span>
                  <span className="font-mono text-white font-semibold">{approveTarget?.user_email}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Click the button below to copy the customers email and open Brevo's sign-up portal in a new tab. Brevo will send the confirmation link directly to their inbox.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (approveTarget?.user_email) {
                      navigator.clipboard.writeText(approveTarget.user_email);
                      toast.success(`Copied "${approveTarget.user_email}" to clipboard! Opening Brevo signup...`);
                      window.open("https://app.brevo.com/account/register", "_blank");
                    }
                  }}
                  className="w-full text-xs font-bold border-purple-500/40 text-purple-300 hover:bg-purple-500/20 gap-2 h-9 mt-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Copy Email & Open Brevo Signup
                </Button>
              </div>
            )}

            {targetStatus === "approved" && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Customer's Brevo API Key *</Label>
                <Input
                  placeholder="xkeysib-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="text-xs font-mono h-9"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Daily Email Limit (Emails per Day) *</Label>
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                min={10}
                max={50000}
                className="text-xs h-9"
              />
              <p className="text-[10px] text-muted-foreground">Default: 300 emails per day for free Brevo accounts.</p>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="ghost" onClick={() => setApproveTarget(null)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApprove}
              disabled={isSubmittingApprove}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8"
            >
              {isSubmittingApprove
                ? "Processing..."
                : targetStatus === "pending_email_verification"
                ? "Initiate Signup & Trigger Verification Email"
                : "Link API Key & Unlock Email Marketing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md bg-card border-rose-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <XCircle className="h-5 w-5" /> Reject Business Verification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide feedback on why this verification request for {rejectTarget?.business_name} was rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Rejection Reason / Feedback *</Label>
            <Textarea
              placeholder="e.g. Domain verification failed or insufficient social media presence."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button variant="ghost" onClick={() => setRejectTarget(null)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={isSubmittingReject}
              className="font-bold text-xs h-8"
            >
              {isSubmittingReject ? "Rejecting..." : "Reject Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
