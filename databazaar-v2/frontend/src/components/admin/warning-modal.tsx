"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Save, Info, ShieldAlert, CreditCard, Bell, Check } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { adminApi } from "@/lib/api/admin";
import { toast } from "sonner";
import type { User } from "@/lib/types";

interface WarningModalProps {
  targetUser: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const WARNING_CATEGORIES = [
  {
    id: "Important Information",
    title: "Info Notice",
    icon: Info,
    activeClass: "bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-cyan-500/20",
    badgeClass: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  {
    id: "Account Audit Warning",
    title: "Security Audit",
    icon: ShieldAlert,
    activeClass: "bg-amber-500/15 border-amber-500 text-amber-400 shadow-amber-500/20",
    badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    id: "Billing & Credit Policy",
    title: "Billing Alert",
    icon: CreditCard,
    activeClass: "bg-purple-500/15 border-purple-500 text-purple-400 shadow-purple-500/20",
    badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    id: "Security Alert",
    title: "Security Violation",
    icon: AlertTriangle,
    activeClass: "bg-destructive/15 border-destructive text-destructive shadow-destructive/20",
    badgeClass: "bg-destructive/20 text-destructive border-destructive/30",
  },
];

const PRESETS = [
  {
    label: "Verification Notice",
    category: "Important Information",
    text: "[Important Information] Action Required: Please verify your account details within 24 hours.",
  },
  {
    label: "Security Audit Notice",
    category: "Account Audit Warning",
    text: "[Account Audit Warning] Security Notice: Unusual API activity detected. Please confirm your recent activity.",
  },
  {
    label: "Low Balance Alert",
    category: "Billing & Credit Policy",
    text: "[Billing & Credit Policy] Low Balance Alert: Your credit balance is low. Please recharge to avoid interruption.",
  },
  {
    label: "Policy Violation Warning",
    category: "Security Alert",
    text: "[Security Alert] Security sensor detected unauthorized export attempt. Repeated attempts will cause account ban.",
  },
];

export function WarningModal({ targetUser, onClose, onSuccess }: WarningModalProps) {
  const [warningType, setWarningType] = useState("Important Information");
  const [warningMsg, setWarningMsg] = useState(targetUser?.warning_message || "");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!targetUser) return null;

  const activeCatObj = WARNING_CATEGORIES.find((c) => c.id === warningType) || WARNING_CATEGORIES[0];

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

  const handleCategorySelect = (catId: string) => {
    setWarningType(catId);
    setActivePreset(null);
  };

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    setWarningType(preset.category);
    setWarningMsg(preset.text);
    setActivePreset(preset.label);
  };

  return (
    <Dialog open={!!targetUser} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-lg border-amber-500/50 p-5 space-y-4">
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-amber-500">
            <Bell className="h-4 w-4 animate-pulse text-amber-400" /> Issue Application Warning Notice
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Target Customer: <strong className="text-foreground">{targetUser.email}</strong> (ID #{targetUser.id})
          </p>
        </DialogHeader>

        <div className="space-y-3.5">
          {/* Icon-Driven Category Pill Grid */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-foreground">Category Icon Selector:</Label>
              <Badge variant="outline" className={`text-[10px] ${activeCatObj.badgeClass}`}>
                Active: {activeCatObj.title}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {WARNING_CATEGORIES.map((cat) => {
                const isActive = warningType === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`flex items-center gap-2.5 p-2.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                      isActive
                        ? `${cat.activeClass} border-2 shadow-md`
                        : "border-border/40 bg-card/40 text-muted-foreground hover:bg-card/80 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{cat.title}</span>
                    {isActive && <Check className="h-3.5 w-3.5 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">Quick Presets:</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const isActive = activePreset === p.label;
                return (
                  <Button
                    key={p.label}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`text-[10px] h-6 px-2.5 font-medium transition-all ${
                      isActive
                        ? "bg-amber-500 text-black font-bold border-amber-500 shadow-sm"
                        : "border-border/40 text-muted-foreground hover:text-foreground hover:border-amber-500/50"
                    }`}
                    onClick={() => handleApplyPreset(p)}
                  >
                    {isActive ? "✓ " : ""}{p.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Message Area */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Custom Warning Message Text:</Label>
            <Textarea
              value={warningMsg}
              onChange={(e) => {
                setWarningMsg(e.target.value);
                setActivePreset(null);
              }}
              rows={3}
              placeholder="Type customer warning text..."
              className="text-xs font-mono leading-relaxed"
            />
          </div>

          {/* Live Preview */}
          <div className={`p-3 rounded-lg border text-xs space-y-1 transition-all ${activeCatObj.activeClass}`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider">User Dashboard Live Preview</span>
              <Badge variant="outline" className={`text-[10px] ${activeCatObj.badgeClass}`}>
                {activeCatObj.title}
              </Badge>
            </div>
            <div className="text-foreground leading-relaxed font-semibold text-[11px]">
              ⚠️ {warningMsg || "(No text specified - warning notice will be cleared)"}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => handleSave("")}
            disabled={isSubmitting}
            className="gap-1 text-xs h-8 font-bold"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear Warning
          </Button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(warningMsg.trim())}
              disabled={isSubmitting}
              className="bg-amber-500 text-black hover:bg-amber-600 font-extrabold gap-1 text-xs h-8 px-4"
            >
              <Save className="h-3.5 w-3.5" /> Save Warning
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
