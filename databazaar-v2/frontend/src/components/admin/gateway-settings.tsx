"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Settings, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api/admin";
import { paymentsApi } from "@/lib/api/payments";
import { toast } from "sonner";
import type { PaymentConfig } from "@/lib/types";

export function GatewaySettings() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);

  const [bkashNumber, setBkashNumber] = useState("");
  const [bkashAccountType, setBkashAccountType] = useState("");
  const [bkashQrFile, setBkashQrFile] = useState<File | null>(null);

  const [pathaoNumber, setPathaoNumber] = useState("");
  const [pathaoAccountType, setPathaoAccountType] = useState("");
  const [pathaoQrFile, setPathaoQrFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    paymentsApi.packagesConfig().then((res) => {
      setConfig(res.data);
      setBkashNumber(res.data.bkash_number || "");
      setBkashAccountType(res.data.bkash_account_type || "");
      setPathaoNumber(res.data.pathao_number || "");
      setPathaoAccountType(res.data.pathao_account_type || "");
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("bkash_number", bkashNumber);
    formData.append("bkash_account_type", bkashAccountType);
    formData.append("pathao_number", pathaoNumber);
    formData.append("pathao_account_type", pathaoAccountType);
    if (bkashQrFile) formData.append("bkash_qr_file", bkashQrFile);
    if (pathaoQrFile) formData.append("pathao_qr_file", pathaoQrFile);

    setIsSubmitting(true);
    try {
      const res = await adminApi.savePaymentSettings(formData);
      toast.success(res.data.message || "Payment gateway settings updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-panel p-6 border-cyan-500/30">
      <CardContent className="p-0 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <Settings className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-foreground">Payment Gateway & QR Code Settings</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* bKash Section */}
          <div className="space-y-4 p-4 rounded-xl bg-pink-500/5 border border-pink-500/20">
            <h3 className="text-sm font-bold text-pink-400">bKash Payment Gateway</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">bKash Account Number</Label>
                <Input
                  value={bkashNumber}
                  onChange={(e) => setBkashNumber(e.target.value)}
                  placeholder="018XXXXXXXX"
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Type</Label>
                <Input
                  value={bkashAccountType}
                  onChange={(e) => setBkashAccountType(e.target.value)}
                  placeholder="Personal / Send Money"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Upload bKash QR Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBkashQrFile(e.target.files?.[0] || null)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Pathao Pay Section */}
          <div className="space-y-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <h3 className="text-sm font-bold text-emerald-400">Pathao Pay Gateway</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Pathao Pay Number</Label>
                <Input
                  value={pathaoNumber}
                  onChange={(e) => setPathaoNumber(e.target.value)}
                  placeholder="018XXXXXXXX"
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Type</Label>
                <Input
                  value={pathaoAccountType}
                  onChange={(e) => setPathaoAccountType(e.target.value)}
                  placeholder="Personal / Send Money"
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Upload Pathao Pay QR Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPathaoQrFile(e.target.files?.[0] || null)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full font-bold gap-2 py-5">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving Gateway Settings..." : "Save Payment Gateway Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
