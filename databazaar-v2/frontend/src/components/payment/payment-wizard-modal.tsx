"use client";

import { useState, useEffect, type FormEvent } from "react";
import Image from "next/image";
import {
  Coins,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Sparkles,
  QrCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { paymentsApi } from "@/lib/api/payments";
import type { PaymentConfig, PaymentPackage, PaymentRequest } from "@/lib/types";
import bkashLogo from "@/assets/logo/bkash-logo.png";
import pathaoLogo from "@/assets/logo/pathao-pay.png";
import pathaoQr from "@/assets/QR/pathao-qr.jpg";

interface PaymentWizardModalProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentWizardModal({ open, onClose }: PaymentWizardModalProps) {
  const { user, refreshProfile } = useAuth();
  const [modalTab, setModalTab] = useState<"buy" | "history">("buy");
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [myRequests, setMyRequests] = useState<PaymentRequest[]>([]);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState<PaymentPackage | "custom" | null>(null);
  const [customCredits, setCustomCredits] = useState(100);
  const [method, setMethod] = useState<"bkash" | "pathao_pay">("bkash");
  const [copied, setCopied] = useState(false);

  // Form fields
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [trxId, setTrxId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      paymentsApi.packagesConfig().then((r) => setConfig(r.data)).catch(() => {});
      paymentsApi.myRequests().then((r) => setMyRequests(r.data)).catch(() => {});
      if (user) {
        setUserName(user.full_name || "");
        setUserEmail(user.email || "");
      }
    }
  }, [open, user]);

  const loadHistory = () => {
    paymentsApi.myRequests().then((r) => setMyRequests(r.data)).catch(() => {});
  };

  const calculateAmount = () => {
    if (selectedPkg && selectedPkg !== "custom") {
      return { credits: selectedPkg.credits, bdt: selectedPkg.price_bdt, name: selectedPkg.name };
    }
    const rate = config?.custom_package?.price_per_credit_bdt || 10;
    const creds = Number(customCredits) || 50;
    return {
      credits: creds,
      bdt: creds * rate,
      name: `Custom Pack (${creds} Credits)`,
    };
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    toast.success("Account number copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitTrx = async (e: FormEvent) => {
    e.preventDefault();
    if (!userPhone || !trxId) {
      toast.warning("Please enter your Sender Phone Number and Transaction ID (TrxID).");
      return;
    }

    const details = calculateAmount();
    setIsSubmitting(true);

    try {
      const res = await paymentsApi.submitRequest({
        package_name: details.name,
        credits_requested: details.credits,
        amount_bdt: details.bdt,
        payment_method: method,
        user_name: userName || userEmail,
        bkash_number: userPhone,
        transaction_id: trxId,
      });
      toast.success(res.data.message || "Payment proof submitted! Verifying...");
      setStep(4);
      loadHistory();
      refreshProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetNumber = method === "bkash" ? (config?.bkash_number || "01863443343") : (config?.pathao_number || "01863443343");
  const targetType = method === "bkash" ? (config?.bkash_account_type || "Personal / Send Money") : (config?.pathao_account_type || "Send Money");

  const packages = config?.packages || [];
  const customRate = config?.custom_package?.price_per_credit_bdt || 10;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel w-[96vw] max-w-6xl sm:max-w-6xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 border-border/40">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold text-foreground">
            <Coins className="h-6 w-6 text-amber-500" />
            Credit Recharge & Package Upgrade Portal
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a package tier or slide the credit seek bar to purchase custom credits via bKash or Pathao Pay
          </p>
        </DialogHeader>

        <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as any)} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1">
            <TabsTrigger value="buy" className="gap-2 text-xs font-semibold">
              <Coins className="h-4 w-4 text-amber-500" /> Purchase Wizard
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
              <History className="h-4 w-4 text-cyan-400" /> Order Submissions ({myRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PURCHASE WIZARD */}
          <TabsContent value="buy" className="space-y-6 pt-4">
            {/* Step Indicator */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
              {[
                "1. Choose Tier / Credits",
                "2. Send Payment & Scan QR",
                "3. Submit TrxID Proof",
                "4. Instant Admin Credit",
              ].map((st, i) => (
                <div
                  key={i}
                  className={`py-2 px-2 rounded-lg border transition-all ${
                    step === i + 1
                      ? "border-amber-500 bg-amber-500/10 text-amber-500 font-bold"
                      : step > i + 1
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-border/40 text-muted-foreground opacity-70"
                  }`}
                >
                  {st}
                </div>
              ))}
            </div>

            {/* STEP 1: Select Package or Custom Credits */}
            {step === 1 && (
              <div className="space-y-8">
                {/* 1A. Packages Grid with Feature Bullet Points */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Select Package Tier (Full Features Included)
                    </h3>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Best Value Tiers
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {packages.map((pkg) => {
                      const isSelected = selectedPkg === pkg;
                      const isPopular = pkg.popular;
                      return (
                        <Card
                          key={pkg.id}
                          onClick={() => setSelectedPkg(pkg)}
                          className={`relative flex flex-col justify-between p-5 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "border-amber-500 bg-amber-500/10 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/50"
                              : "border-border/40 hover:border-border/80 bg-card/60"
                          }`}
                        >
                          {isPopular && (
                            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black font-bold uppercase text-[10px] px-2.5 py-0.5">
                              {pkg.badge || "MOST POPULAR"}
                            </Badge>
                          )}

                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-base text-foreground">{pkg.name}</h4>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{pkg.description}</p>
                              </div>
                            </div>

                            <div className="flex items-baseline gap-2 border-b border-border/30 pb-3">
                              <span className="text-2xl font-extrabold font-mono text-amber-500">
                                ৳{pkg.price_bdt.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                BDT / {pkg.credits} Credits
                              </span>
                            </div>

                            {/* Features list */}
                            <ul className="space-y-2 text-xs">
                              {pkg.features.map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-foreground/90">
                                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span className="leading-snug">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-4 mt-auto">
                            <Button
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              className={`w-full font-bold text-xs ${
                                isSelected ? "bg-amber-500 text-black hover:bg-amber-600" : ""
                              }`}
                            >
                              {isSelected ? "Selected" : "Select " + pkg.name}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* 1B. Custom Credits Calculator (Seek Bar Slider) */}
                <Card
                  className={`p-6 border transition-all ${
                    selectedPkg === "custom"
                      ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50"
                      : "border-border/40 bg-card/40 hover:border-border/80"
                  }`}
                  onClick={() => setSelectedPkg("custom")}
                >
                  <CardContent className="p-0 space-y-5">
                    <div className="flex flex-wrap justify-between items-center gap-2 border-b border-border/30 pb-3">
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-cyan-400" />
                        <h4 className="font-bold text-sm text-foreground">
                          Custom Credit Pack Calculator (Seek Bar Slider)
                        </h4>
                      </div>
                      <Badge variant="outline" className="text-xs border-cyan-500/40 text-cyan-400">
                        ৳{customRate} BDT / Credit
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Slider controls */}
                      <div className="md:col-span-7 space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground font-semibold">Slide to choose custom credits:</span>
                          <span className="font-mono font-extrabold text-amber-500 text-base">
                            {customCredits} Credits
                          </span>
                        </div>

                        <Slider
                          value={[customCredits]}
                          min={10}
                          max={1000}
                          step={10}
                          onValueChange={(val) => {
                            const num = Array.isArray(val) ? val[0] : typeof val === "number" ? val : 100;
                            setCustomCredits(num);
                            setSelectedPkg("custom");
                          }}
                          className="py-2"
                        />

                        {/* Quick Preset Buttons */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {[50, 100, 250, 500, 1000].map((preset) => (
                            <Button
                              key={preset}
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomCredits(preset);
                                setSelectedPkg("custom");
                              }}
                              className={`h-7 text-xs font-mono ${
                                customCredits === preset && selectedPkg === "custom"
                                  ? "border-amber-500 bg-amber-500/20 text-amber-500"
                                  : "border-border/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {preset} CR
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Total calculation box */}
                      <div className="md:col-span-5 rounded-xl border border-border/50 bg-background/80 p-4 text-center space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Custom Order Total
                        </div>
                        <div className="text-2xl font-extrabold font-mono text-amber-500">
                          ৳{(customCredits * customRate).toLocaleString()} BDT
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {customCredits} Credits @ ৳{customRate} BDT/CR
                        </div>
                        <Button
                          size="sm"
                          variant={selectedPkg === "custom" ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPkg("custom");
                          }}
                          className="w-full text-xs font-bold mt-2"
                        >
                          {selectedPkg === "custom" ? "Custom Pack Selected" : "Select Custom Pack"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 1C. Choose Payment Method */}
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-bold text-foreground">Select Payment Method</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card
                      onClick={() => setMethod("bkash")}
                      className={`p-4 cursor-pointer flex items-center gap-3 border transition-all ${
                        method === "bkash"
                          ? "border-pink-500 bg-pink-500/10 ring-2 ring-pink-500/40"
                          : "border-border/40 hover:border-border bg-card/60"
                      }`}
                    >
                      <Image src={bkashLogo} alt="bKash" width={44} height={44} className="rounded-lg object-contain" />
                      <div>
                        <div className="font-bold text-sm text-foreground">bKash Personal / Send Money</div>
                        <div className="text-xs text-muted-foreground">bKash App / Dial *247#</div>
                      </div>
                    </Card>

                    <Card
                      onClick={() => setMethod("pathao_pay")}
                      className={`p-4 cursor-pointer flex items-center gap-3 border transition-all ${
                        method === "pathao_pay"
                          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/40"
                          : "border-border/40 hover:border-border bg-card/60"
                      }`}
                    >
                      <Image src={pathaoLogo} alt="Pathao Pay" width={44} height={44} className="rounded-lg object-contain" />
                      <div>
                        <div className="font-bold text-sm text-foreground">Pathao Pay / QR Scan</div>
                        <div className="text-xs text-muted-foreground">Scan QR or Send Money</div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedPkg}
                  className="w-full font-bold gap-2 py-6 text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-600 hover:to-amber-700"
                >
                  Proceed to Payment & QR Scan <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* STEP 2: Send Money Details & QR Code */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left Column: QR Code Display */}
                  <div className="md:col-span-5 text-center">
                    <Card className="p-4 border-amber-500/40 bg-card/80 space-y-3">
                      <div className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                        <QrCode className="h-4 w-4 text-amber-500" />
                        {method === "bkash" ? "bKash Payment Guide" : "Pathao Pay Scan & Pay QR"}
                      </div>

                      {method === "pathao_pay" ? (
                        <div className="rounded-xl overflow-hidden border border-border/50 bg-white p-2 max-w-[220px] mx-auto shadow-md">
                          <Image
                            src={pathaoQr}
                            alt="Pathao Pay QR Code"
                            width={220}
                            height={220}
                            className="object-contain w-full h-auto rounded"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl overflow-hidden border border-border/50 bg-gradient-to-br from-pink-500/10 via-card to-card p-6 max-w-[220px] mx-auto flex flex-col items-center justify-center gap-3">
                          <Image src={bkashLogo} alt="bKash Logo" width={80} height={80} className="object-contain" />
                          <Badge variant="outline" className="border-pink-500/40 text-pink-400 text-[10px]">
                            bKash Personal Account
                          </Badge>
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground">
                        {method === "pathao_pay"
                          ? "Open Pathao App › Tap QR Scan › Point camera at the QR code above"
                          : "Open bKash App › Select Send Money › Enter the account number"}
                      </p>
                    </Card>
                  </div>

                  {/* Right Column: Account Details & Amount */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="p-5 rounded-xl bg-card border border-border/50 space-y-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {method === "bkash" ? "bKash Personal Number:" : "Pathao Pay Number:"}
                      </div>

                      <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-500 flex items-center gap-3">
                        {targetNumber}
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopyNumber(targetNumber)}
                          className="h-9 w-9 shrink-0 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                        >
                          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>

                      <Badge variant="outline" className="text-xs border-primary/30">
                        Account Type: {targetType}
                      </Badge>

                      <div className="p-3 rounded-lg bg-background/80 border border-border/40 text-xs space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Package / Selection:</span>
                          <span className="font-bold text-foreground">{calculateAmount().name}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Credits to Receive:</span>
                          <span className="font-bold text-amber-500">+{calculateAmount().credits} CR</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground border-t border-border/40 pt-1 mt-1">
                          <span className="font-bold text-foreground">Total Payable BDT:</span>
                          <span className="font-extrabold font-mono text-amber-500 text-sm">
                            ৳{calculateAmount().bdt.toLocaleString()} BDT
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 max-w-md mx-auto pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Packages
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1 font-bold gap-2 bg-amber-500 text-black hover:bg-amber-600">
                    I Have Completed Payment <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Submit TrxID Form */}
            {step === 3 && (
              <form onSubmit={handleSubmitTrx} className="space-y-4 max-w-lg mx-auto p-4 rounded-xl border border-border/40 bg-card/60">
                <h4 className="text-sm font-bold text-foreground border-b border-border/40 pb-2">
                  Submit Payment Verification Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Customer Name *</Label>
                    <Input value={userName} onChange={(e) => setUserName(e.target.value)} required className="text-xs h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Customer Email Address *</Label>
                    <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required className="text-xs h-9" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Sender Phone Number (Mobile Account Number) *</Label>
                  <Input
                    placeholder="e.g. 01824500704"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    required
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {method === "bkash" ? "bKash" : "Pathao Pay"} Transaction ID (TrxID) *
                  </Label>
                  <Input
                    placeholder="e.g. 8N7A6B5C4D"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    required
                    className="uppercase tracking-widest font-mono text-xs h-9 border-amber-500/50"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 gap-2 text-xs">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 font-bold gap-2 text-xs bg-amber-500 text-black hover:bg-amber-600">
                    {isSubmitting ? "Submitting..." : "Submit Proof"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 4: Success / Pending State */}
            {step === 4 && (
              <div className="text-center py-8 space-y-6">
                <div className="h-16 w-16 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-500 flex items-center justify-center mx-auto">
                  <Clock className="h-8 w-8 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Step 4: Pending Admin Verification</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Your payment proof has been recorded. Admin is reviewing your Transaction ID (
                    <span className="font-mono text-amber-500 font-bold">{trxId}</span>) and will credit your account shortly.
                  </p>
                </div>

                <Button onClick={() => setModalTab("history")} className="gap-2 bg-amber-500 text-black hover:bg-amber-600">
                  <History className="h-4 w-4" /> Track Status in Order History
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: HISTORY */}
          <TabsContent value="history" className="space-y-4 pt-4">
            {myRequests.map((req) => (
              <Card key={req.id} className="p-4 glass-panel space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-border/40 pb-2">
                  <div>
                    <span className="font-bold text-sm text-foreground">{req.package_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">Order #{req.id}</span>
                  </div>

                  <div>
                    {req.status === "pending" && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-500 gap-1">
                        <Clock className="h-3 w-3" /> Pending Verification
                      </Badge>
                    )}
                    {req.status === "approved" && (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Approved & Credited
                      </Badge>
                    )}
                    {req.status === "rejected" && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
                        <XCircle className="h-3 w-3" /> Rejected
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Method: <strong className="text-foreground uppercase">{req.payment_method}</strong> | Sender: {req.bkash_number}</span>
                  <span>TrxID: <strong className="text-primary">{req.transaction_id}</strong> | Credits: <strong className="text-amber-500">+{req.credits_requested} CR</strong></span>
                </div>
              </Card>
            ))}

            {myRequests.length === 0 && (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No payment submissions found.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
