"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (val: string) => void;
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

export function PromptModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  label,
  defaultValue = "",
  placeholder = "Enter details...",
  confirmText = "Submit",
  cancelText = "Cancel",
}: PromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, open]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onConfirm(value);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-panel border-border/40 sm:max-w-md">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {label && <Label className="text-xs font-semibold">{label}</Label>}
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="text-xs h-10"
            autoFocus
          />

          <DialogFooter className="gap-2 pt-2 border-t-0 bg-transparent">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              {cancelText}
            </Button>
            <Button type="submit" size="sm" className="text-xs font-bold">
              {confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
