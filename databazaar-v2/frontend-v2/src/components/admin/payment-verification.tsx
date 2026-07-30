"use client";

import { Check, X, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api/admin";
import { toast } from "sonner";
import type { PaymentRequest } from "@/lib/types";

interface PaymentVerificationProps {
  requests: PaymentRequest[];
  onRefresh: () => void;
}

export function PaymentVerification({ requests, onRefresh }: PaymentVerificationProps) {
  const handleApprove = async (id: number) => {
    try {
      const res = await adminApi.approvePayment(id);
      toast.success(res.data.message || "Payment approved & credits added!");
      onRefresh();
    } catch {
      toast.error("Failed to approve payment.");
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Enter rejection reason for customer:", "Invalid Transaction ID or amount mismatch");
    if (!reason) return;
    try {
      await adminApi.rejectPayment(id, reason);
      toast.info("Payment rejected.");
      onRefresh();
    } catch {
      toast.error("Failed to reject payment.");
    }
  };

  return (
    <Card className="glass-panel p-6">
      <CardContent className="p-0 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Customer BDT Payment Submissions Verification</h3>

        <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID #</TableHead>
                <TableHead>Customer Email / Name</TableHead>
                <TableHead>Package Requested</TableHead>
                <TableHead>Method & Sender</TableHead>
                <TableHead>Transaction ID (TrxID)</TableHead>
                <TableHead>Credits / BDT</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{r.id}</TableCell>
                  <TableCell className="text-xs font-semibold">{r.user_email || r.full_name}</TableCell>
                  <TableCell className="text-xs font-bold text-foreground">{r.package_name}</TableCell>
                  <TableCell className="text-xs font-mono">
                    <span className="uppercase text-cyan-400 font-bold">{r.payment_method}</span> ({r.bkash_number})
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-amber-500 tracking-wider">
                    {r.transaction_id}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    +{r.credits_requested} CR (৳{r.amount_bdt})
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" && (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 gap-1">
                        <Clock className="h-3 w-3" /> PENDING
                      </Badge>
                    )}
                    {r.status === "approved" && (
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                        APPROVED
                      </Badge>
                    )}
                    {r.status === "rejected" && (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                        REJECTED
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(r.id)}
                          className="h-7 text-xs bg-emerald-500 text-black hover:bg-emerald-600 font-bold gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(r.id)}
                          className="h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-xs text-muted-foreground">
                    No payment submissions to verify.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
