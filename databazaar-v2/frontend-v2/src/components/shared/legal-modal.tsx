"use client";

import { Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LegalModalProps {
  type: "privacy" | "terms" | null;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  return (
    <Dialog open={!!type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-panel max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Shield className="h-5 w-5 text-cyan-400" />
            {type === "privacy" ? "Privacy Policy" : "Terms of Service"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed py-4">
          {type === "privacy" ? (
            <>
              <p>
                <strong className="text-foreground">1. Data Protection:</strong>{" "}
                MarketingOstad respects user privacy. User emails and registration details are securely managed with encryption.
              </p>
              <p>
                <strong className="text-foreground">2. Usage Log & Security:</strong>{" "}
                Browsing patterns and request headers are logged strictly for security enforcement, rate limiting, and system abuse prevention.
              </p>
              <p>
                <strong className="text-foreground">3. Third-party Sharing:</strong>{" "}
                We never sell user credential data or personal information to third-party advertisers.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong className="text-foreground">1. Terms of Use:</strong>{" "}
                Users must verify their email link before accessing the platform. Misuse of scraped data for illegal spamming is strictly prohibited.
              </p>
              <p>
                <strong className="text-foreground">2. Credit Policy:</strong>{" "}
                Default catalog datasets are 0 Credits (FREE). Custom scraper runs and marketing dispatches consume credits based on selected packages.
              </p>
              <p>
                <strong className="text-foreground">3. Refunds & Non-Expiring Credits:</strong>{" "}
                Credits purchased are non-expiring and balance will remain intact indefinitely until consumed.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
