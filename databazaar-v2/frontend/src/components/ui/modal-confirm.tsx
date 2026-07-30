"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
}: ConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-panel border-border/40 sm:max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            {isDanger ? (
              <div className="p-2 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
            ) : null}
            <DialogTitle className="text-base font-bold">{title}</DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="gap-2 pt-2 border-t-0 bg-transparent">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            {cancelText}
          </Button>
          <Button
            size="sm"
            variant={isDanger ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="text-xs font-bold"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
