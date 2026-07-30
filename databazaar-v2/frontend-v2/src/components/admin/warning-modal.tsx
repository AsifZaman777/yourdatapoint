"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api/admin";
import { toast } from "sonner";
import type { User } from "@/lib/types";

interface WarningModalProps {
  targetUser: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function WarningModal({ targetUser, onClose, onSuccess }: WarningModalProps) {
  const [warningType, setWarningType] = useState("Important Information");
  const [warningMsg, setWarningMsg] = useState(targetUser?.warning_message || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!targetUser) return null;

  const handleSave = async (msgToSave: string) => {
    setIsSubmitting(true);
    try {
      await adminApi.setWarning(targetUser.id, msgToSave);
      toast.success(
        msgToSave
          ? `Warning issued to ${targetUser.email}!`
          : `Warning cleared for ${targetUser.email}.`
      );
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to update warning.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!targetUser} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-lg border-amber-500/50 p-6 space-y-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-500">
            <AlertTriangle className="h-5 w-5" /> Issue Application Warning Notice
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Target Customer: <strong className="text-foreground">{targetUser.email}</strong> (ID #{targetUser.id})
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Warning Notice Category</Label>
            <Select value={warningType} onValueChange={(val) => setWarningType(val || "")}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Important Information">ℹ️ Important Information / Action Required</SelectItem>
                <SelectItem value="Account Audit Warning">⚠️ Account Audit Warning / Security Verification</SelectItem>
                <SelectItem value="Billing & Credit Policy">💳 Billing & Credit Policy Notice</SelectItem>
                <SelectItem value="Security Alert">🚨 Security Alert / Suspicious Activity Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Quick Presets (1-Click Insert):</Label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2"
                onClick={() =>
                  setWarningMsg(
                    `[${warningType}] Important: Please verify your account information within 24 hours.`
                  )
                }
              >
                Verification Notice
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2"
                onClick={() =>
                  setWarningMsg(
                    `[${warningType}] Account Under Review: Unusual API activity detected. Please contact support.`
                  )
                }
              >
                Security Notice
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2"
                onClick={() =>
                  setWarningMsg(
                    `[${warningType}] Low Balance Alert: Re-charge credits balance to avoid scraper interruption.`
                  )
                }
              >
                Low Balance Alert
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom Warning Text</Label>
            <Textarea
              value={warningMsg}
              onChange={(e) => setWarningMsg(e.target.value)}
              rows={4}
              placeholder="Type warning text for dashboard display..."
              className="text-xs"
            />
          </div>

          {/* Live Preview */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
            <div className="text-[10px] font-bold text-amber-500 uppercase">User Dashboard Preview:</div>
            <div className="text-foreground">
              <strong>⚠️ {warningType}:</strong> {warningMsg || "(No text)"}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => handleSave("")}
            disabled={isSubmitting}
            className="gap-1 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Warning
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(warningMsg.trim())}
              disabled={isSubmitting}
              className="bg-amber-500 text-black hover:bg-amber-600 font-bold gap-1 text-xs"
            >
              <Save className="h-3.5 w-3.5" /> Save Warning
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
