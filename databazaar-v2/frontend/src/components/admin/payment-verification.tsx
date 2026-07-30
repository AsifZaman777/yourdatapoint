"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromptModal } from "@/components/ui/modal-prompt";
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
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);

  const handleApprove = async (id: number) => {
    try {
      const res = await adminApi.approvePayment(id);
      toast.success(res.data.message || "Payment approved & credits added!");
      onRefresh();
    } catch {
      toast.error("Failed to approve payment.");
    }
  };

  const confirmReject = async (reason: string) => {
    if (!rejectTargetId || !reason) return;
    try {
      await adminApi.rejectPayment(rejectTargetId, reason);
      toast.info("Payment rejected.");
      onRefresh();
    } catch {
      toast.error("Failed to reject payment.");
    } finally {
      setRejectTargetId(null);
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
                <TableHead>Status</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{req.id}</TableCell>
                  <TableCell className="text-xs font-semibold">
                    <div>{req.user_email}</div>
                    <div className="text-[10px] text-muted-foreground">{req.full_name || "Customer"}</div>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-cyan-400">
                    <div>{req.package_name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">৳{req.amount_bdt} BDT</div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    <div className="uppercase font-bold text-amber-500">{req.payment_method}</div>
                    <div className="text-[10px] text-muted-foreground">{req.bkash_number}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-foreground tracking-wider">
                    {req.transaction_id}
                  </TableCell>
                  <TableCell>
                    {req.status === "pending" && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px]">
                        Pending Review
                      </Badge>
                    )}
                    {req.status === "approved" && (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                        Approved
                      </Badge>
                    )}
                    {req.status === "rejected" && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                        Rejected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          className="h-7 text-[11px] px-2 bg-emerald-500 text-black font-bold hover:bg-emerald-600 gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectTargetId(req.id)}
                          className="h-7 text-[11px] px-2 gap-1"
                        >
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Processed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                    No payment verification requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <PromptModal
        open={!!rejectTargetId}
        onClose={() => setRejectTargetId(null)}
        onConfirm={confirmReject}
        title="Reject Customer Payment"
        description="Enter the reason for rejection to notify the customer:"
        defaultValue="Invalid Transaction ID or amount mismatch"
        placeholder="Enter rejection reason..."
        confirmText="Reject Payment"
      />
    </Card>
  );
}
