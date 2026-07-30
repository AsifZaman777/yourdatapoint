"use client";

import { Check, X } from "lucide-react";
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
import type { PromotionRequest } from "@/lib/types";

interface PromotionRequestsProps {
  requests: PromotionRequest[];
  onRefresh: () => void;
}

export function PromotionRequests({ requests, onRefresh }: PromotionRequestsProps) {
  const handleApprove = async (jobId: number) => {
    try {
      const res = await adminApi.approvePromotion(jobId);
      toast.success(res.data.message || "Promotion approved!");
      onRefresh();
    } catch {
      toast.error("Failed to approve promotion.");
    }
  };

  const handleReject = async (jobId: number) => {
    try {
      await adminApi.rejectPromotion(jobId);
      toast.info("Promotion request rejected.");
      onRefresh();
    } catch {
      toast.error("Failed to reject promotion.");
    }
  };

  return (
    <Card className="glass-panel p-6">
      <CardContent className="p-0 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Scraper Job Promotion Requests to Public Catalog</h3>

        <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Job #</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Proposed Dataset Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{r.job_id}</TableCell>
                  <TableCell className="text-xs font-semibold">{r.user_email}</TableCell>
                  <TableCell className="text-xs font-bold text-foreground">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                      {r.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(r.job_id)}
                          className="h-7 text-xs bg-emerald-500 text-black hover:bg-emerald-600 font-bold gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(r.job_id)}
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
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    No pending dataset promotion requests.
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
