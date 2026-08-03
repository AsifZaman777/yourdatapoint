"use client";

import { useState, useEffect } from "react";
import {
  Coins,
  Save,
  Plus,
  Trash2,
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { paymentsApi } from "@/lib/api/payments";
import { adminApi } from "@/lib/api/admin";
import { toast } from "sonner";
import type { PaymentPackage } from "@/lib/types";

export function PackageSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [customRate, setCustomRate] = useState(10);
  const [minCredits, setMinCredits] = useState(10);
  const [maxCredits, setMaxCredits] = useState(5000);

  // Load current package configuration
  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.packagesConfig();
      setPackages(res.data.packages || []);
      if (res.data.custom_package) {
        setCustomRate(res.data.custom_package.price_per_credit_bdt || 10);
        setMinCredits(res.data.custom_package.min_credits || 10);
        setMaxCredits(res.data.custom_package.max_credits || 5000);
      }
    } catch {
      toast.error("Failed to load package configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Update package fields
  const handleUpdatePackage = (index: number, key: keyof PaymentPackage, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [key]: value };
    setPackages(updated);
  };

  // Feature line management for a package
  const handleAddFeature = (pkgIndex: number) => {
    const updated = [...packages];
    const features = [...(updated[pkgIndex].features || []), ""];
    updated[pkgIndex] = { ...updated[pkgIndex], features };
    setPackages(updated);
  };

  const handleUpdateFeature = (pkgIndex: number, featIndex: number, text: string) => {
    const updated = [...packages];
    const features = [...(updated[pkgIndex].features || [])];
    features[featIndex] = text;
    updated[pkgIndex] = { ...updated[pkgIndex], features };
    setPackages(updated);
  };

  const handleRemoveFeature = (pkgIndex: number, featIndex: number) => {
    const updated = [...packages];
    const features = updated[pkgIndex].features.filter((_, i) => i !== featIndex);
    updated[pkgIndex] = { ...updated[pkgIndex], features };
    setPackages(updated);
  };

  // Add new package tier
  const handleAddPackage = () => {
    const newPkg: PaymentPackage = {
      id: `pkg_${Date.now()}`,
      name: "New Tier Package",
      credits: 100,
      price_bdt: 1000,
      popular: false,
      badge: "New Tier",
      description: "Package description & features summary.",
      features: ["100 Verified Lead Credits", "Full Contact Access", "CSV/Excel Download"],
    };
    setPackages([...packages, newPkg]);
  };

  // Delete package tier
  const handleDeletePackage = (index: number) => {
    if (packages.length <= 1) {
      toast.warning("At least one package tier must remain.");
      return;
    }
    setPackages(packages.filter((_, i) => i !== index));
  };

  // Save all settings to backend packages.json
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        packages,
        custom_package: {
          name: "Custom Upgrade",
          price_per_credit_bdt: Number(customRate) || 10,
          min_credits: Number(minCredits) || 10,
          max_credits: Number(maxCredits) || 5000,
          step: 10,
          description: "Select the exact credit amount your team requires:",
        },
      };

      const res = await adminApi.savePackageSettings(payload);
      toast.success(res.data.message || "Package pricing & features updated!");
      loadConfig();
    } catch {
      toast.error("Failed to save package settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-card/60 rounded-xl border border-border/30" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-96 bg-card/60 rounded-xl border border-border/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Module Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Package Settings & Pricing Control
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure subscription tier pricing, credit allocations, and feature lists per package in real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-purple-500/40 text-purple-400 gap-1.5 py-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Super Admin Access
          </Badge>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 font-bold bg-amber-500 text-black hover:bg-amber-600"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Package Settings"}
          </Button>
        </div>
      </div>

      {/* Package Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Active Subscription Packages ({packages.length})
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddPackage}
            className="gap-1.5 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Package Tier
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {packages.map((pkg, pIdx) => (
            <Card
              key={pkg.id || pIdx}
              className={`glass-panel p-5 border space-y-4 relative transition-all ${
                pkg.popular
                  ? "border-amber-500/60 bg-amber-500/5 shadow-xl shadow-amber-500/5"
                  : "border-border/40 bg-card/60"
              }`}
            >
              {/* Header Badge & Delete */}
              <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono border-primary/40 text-primary">
                    ID: {pkg.id}
                  </Badge>
                  {pkg.popular && (
                    <Badge className="bg-amber-500 text-black text-[10px] font-bold">
                      {pkg.badge || "POPULAR"}
                    </Badge>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeletePackage(pIdx)}
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Package Details Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-[11px]">Package Name *</Label>
                  <Input
                    value={pkg.name}
                    onChange={(e) => handleUpdatePackage(pIdx, "name", e.target.value)}
                    className="text-xs h-8 font-bold mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Price (৳ BDT) *</Label>
                    <Input
                      type="number"
                      value={pkg.price_bdt}
                      onChange={(e) => handleUpdatePackage(pIdx, "price_bdt", Number(e.target.value))}
                      className="text-xs h-8 font-mono font-bold text-amber-500 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px]">Credits Provided *</Label>
                    <Input
                      type="number"
                      value={pkg.credits}
                      onChange={(e) => handleUpdatePackage(pIdx, "credits", Number(e.target.value))}
                      className="text-xs h-8 font-mono font-bold mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px]">Badge Text</Label>
                    <Input
                      value={pkg.badge || ""}
                      onChange={(e) => handleUpdatePackage(pIdx, "badge", e.target.value)}
                      placeholder="e.g. Most Popular"
                      className="text-xs h-8 mt-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-5">
                    <Checkbox
                      id={`popular-${pIdx}`}
                      checked={pkg.popular || false}
                      onCheckedChange={(c) => handleUpdatePackage(pIdx, "popular", !!c)}
                    />
                    <label htmlFor={`popular-${pIdx}`} className="text-[11px] font-semibold text-foreground cursor-pointer">
                      Highlight Popular
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-[11px]">Package Description</Label>
                  <Textarea
                    value={pkg.description || ""}
                    onChange={(e) => handleUpdatePackage(pIdx, "description", e.target.value)}
                    rows={2}
                    className="text-xs mt-1"
                  />
                </div>

                {/* Features List Section */}
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-foreground">
                      Features List ({pkg.features?.length || 0})
                    </Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddFeature(pIdx)}
                      className="h-6 text-[10px] px-2 gap-1 text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-3 w-3" /> Add Line
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(pkg.features || []).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <Input
                          value={feat}
                          onChange={(e) => handleUpdateFeature(pIdx, fIdx, e.target.value)}
                          placeholder="Feature description line..."
                          className="text-xs h-7 flex-1"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveFeature(pIdx, fIdx)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Credit Calculator Settings */}
      <Card className="glass-panel p-5 border border-cyan-500/30">
        <CardContent className="p-0 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            Custom Credit Calculator Settings (Seek Bar Slider Configuration)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <Label className="text-[11px] font-semibold">Custom Rate (৳ BDT per Credit) *</Label>
              <Input
                type="number"
                step="0.5"
                value={customRate}
                onChange={(e) => setCustomRate(Number(e.target.value))}
                className="text-xs h-9 font-mono font-bold text-amber-500 mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold">Minimum Credit Limit *</Label>
              <Input
                type="number"
                value={minCredits}
                onChange={(e) => setMinCredits(Number(e.target.value))}
                className="text-xs h-9 font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold">Maximum Credit Limit *</Label>
              <Input
                type="number"
                value={maxCredits}
                onChange={(e) => setMaxCredits(Number(e.target.value))}
                className="text-xs h-9 font-mono mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
