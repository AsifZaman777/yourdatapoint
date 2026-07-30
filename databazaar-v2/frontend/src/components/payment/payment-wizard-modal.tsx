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
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { paymentsApi } from "@/lib/api/payments";
import type { PaymentConfig, PaymentPackage, PaymentRequest } from "@/lib/types";
import bkashLogo from "@/assets/logo/bkash-logo.png";
import pathaoLogo from "@/assets/logo/pathao-pay.png";

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
      name: config?.custom_package?.name || "Custom Credit Pack",
    };
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    toast.success("Number copied to clipboard!");
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

  const targetNumber = method === "bkash" ? config?.bkash_number : config?.pathao_number;
  const targetType = method === "bkash" ? config?.bkash_account_type : config?.pathao_account_type;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Coins className="h-5 w-5 text-amber-500" />
            Credit Recharge & Package Upgrade Portal
          </DialogTitle>
        </DialogHeader>

        <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30">
            <TabsTrigger value="buy" className="gap-2 text-xs font-semibold">
              <Coins className="h-3.5 w-3.5" /> Purchase Wizard
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
              <History className="h-3.5 w-3.5" /> Order Submissions ({myRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PURCHASE WIZARD */}
          <TabsContent value="buy" className="space-y-6 pt-4">
            {/* Step Progress Line */}
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-semibold">
              {[
                "1. Select Package",
                "2. Send Payment",
                "3. Submit TrxID",
                "4. Admin Approval",
              ].map((st, i) => (
                <div
                  key={i}
                  className={`py-2 px-1 rounded-md border ${
                    step === i + 1
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                      : step > i + 1
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-border/40 text-muted-foreground"
                  }`}
                >
                  {st}
                </div>
              ))}
            </div>

            {/* STEP 1: Select Package & Method */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(config?.packages || []).map((pkg) => (
                    <Card
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className={`p-4 cursor-pointer transition-all border ${
                        selectedPkg === pkg
                          ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                          : "border-border/40 hover:border-border"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="font-bold text-sm">{pkg.name}</div>
                        <div className="text-xl font-extrabold font-mono text-amber-500">
                          ৳{pkg.price_bdt} BDT
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          +{pkg.credits} Credits
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Method selector */}
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-semibold">Choose Payment Method</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Card
                      onClick={() => setMethod("bkash")}
                      className={`p-4 cursor-pointer flex items-center gap-3 border transition-all ${
                        method === "bkash"
                          ? "border-pink-500 bg-pink-500/10"
                          : "border-border/40 hover:border-border"
                      }`}
                    >
                      <Image src={bkashLogo} alt="bKash" width={40} height={40} className="rounded-lg object-contain" />
                      <div>
                        <div className="font-bold text-sm">bKash Personal</div>
                        <div className="text-xs text-muted-foreground">Send Money / Cash-in</div>
                      </div>
                    </Card>

                    <Card
                      onClick={() => setMethod("pathao_pay")}
                      className={`p-4 cursor-pointer flex items-center gap-3 border transition-all ${
                        method === "pathao_pay"
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-border/40 hover:border-border"
                      }`}
                    >
                      <Image src={pathaoLogo} alt="Pathao Pay" width={40} height={40} className="rounded-lg object-contain" />
                      <div>
                        <div className="font-bold text-sm">Pathao Pay</div>
                        <div className="text-xs text-muted-foreground">Send Money</div>
                      </div>
                    </Card>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedPkg}
                  className="w-full font-bold gap-2 py-5"
                >
                  Proceed to Payment Details <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* STEP 2: Send Money Details */}
            {step === 2 && (
              <div className="space-y-6 text-center">
                <div className="p-6 rounded-xl bg-card border border-border/50 space-y-4 max-w-md mx-auto">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Send Money / Payment Target:
                  </div>

                  <div className="text-2xl font-extrabold font-mono text-amber-500 flex items-center justify-center gap-2">
                    {targetNumber || "01863443343"}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopyNumber(targetNumber || "01863443343")}
                      className="h-8 w-8"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    Account Type: {targetType || "Personal / Send Money"}
                  </Badge>

                  <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                    Total Payable Amount:{" "}
                    <strong className="text-foreground text-sm font-mono">
                      ৳{calculateAmount().bdt} BDT
                    </strong>{" "}
                    for{" "}
                    <strong className="text-amber-500">{calculateAmount().credits} Credits</strong>
                  </div>
                </div>

                <div className="flex gap-4 max-w-md mx-auto">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-2 font-bold gap-2">
                    I Have Sent Payment <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Submit TrxID Form */}
            {step === 3 && (
              <form onSubmit={handleSubmitTrx} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input value={userName} onChange={(e) => setUserName(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Customer Email Address *</Label>
                  <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>Sender Phone Number *</Label>
                  <Input
                    placeholder="e.g. 01824500704"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {method === "bkash" ? "bKash" : "Pathao Pay"} Transaction ID (TrxID) *
                  </Label>
                  <Input
                    placeholder="e.g. 8N7A6B5C4D"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    required
                    className="uppercase tracking-widest font-mono"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-2 font-bold gap-2">
                    {isSubmitting ? "Submitting..." : "Submit Proof"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 4: Success / Pending State */}
            {step === 4 && (
              <div className="text-center py-8 space-y-6">
                <div className="h-16 w-16 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-500 flex items-center justify-center mx-auto">
                  <Clock className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Step 4: Pending Admin Verification</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Your payment proof has been recorded. Admin is reviewing your Transaction ID (
                    <span className="font-mono text-primary font-bold">{trxId}</span>) and will credit your account shortly.
                  </p>
                </div>

                <Button onClick={() => setModalTab("history")} className="gap-2">
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
                    <span className="text-xs text-muted-foreground ml-2">Request #{req.id}</span>
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
