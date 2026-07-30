"use client";

import { useState, Fragment } from "react";
import { ChevronDown, ChevronUp, StopCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { Campaign, CampaignLog } from "@/lib/types";

interface CampaignHistoryProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

export function CampaignHistory({ campaigns, onRefresh }: CampaignHistoryProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<CampaignLog[]>([]);
  const [stopTargetId, setStopTargetId] = useState<number | null>(null);

  const handleToggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedLogs([]);
      return;
    }
    setExpandedId(id);
    try {
      const res = await marketingApi.campaignStatus(id);
      setExpandedLogs(res.data.logs || []);
    } catch {
      toast.error("Failed to load campaign logs.");
    }
  };

  const confirmStopCampaign = async () => {
    if (!stopTargetId) return;
    try {
      await marketingApi.stopCampaign(stopTargetId);
      toast.success("Campaign stop signal dispatched.");
      onRefresh();
    } catch {
      toast.error("Failed to stop campaign.");
    } finally {
      setStopTargetId(null);
    }
  };

  return (
    <Card className="glass-panel p-6">
      <CardContent className="p-0 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Campaign Dispatch History & Audit Trail</h3>

        <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Channel / Type</TableHead>
                <TableHead>Target Recipient Group</TableHead>
                <TableHead>Progress (Sent/Total)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <Fragment key={c.id}>
                    <TableRow className="cursor-pointer" onClick={() => handleToggleExpand(c.id)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{c.id}</TableCell>
                      <TableCell className="font-semibold text-xs uppercase">{c.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.recipient_group}</TableCell>
                      <TableCell className="font-mono text-xs text-cyan-400 font-bold">
                        {c.sent} / {c.total} ({c.failed_count} failed)
                      </TableCell>
                      <TableCell>
                        {c.status === "running" && (
                          <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 gap-1 text-[10px]">
                            <Clock className="h-3 w-3 animate-spin" /> Dispatching...
                          </Badge>
                        )}
                        {c.status === "done" && (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </Badge>
                        )}
                        {(c.status === "stopped" || c.status === "failed") && (
                          <Badge variant="outline" className="border-destructive/40 text-destructive gap-1 text-[10px]">
                            <XCircle className="h-3 w-3" /> {c.status.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {c.status === "running" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setStopTargetId(c.id)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              title="Stop Dispatch"
                            >
                              <StopCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleToggleExpand(c.id)}
                            className="h-7 w-7"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Logs Sub-Table */}
                    {isExpanded && (
                      <TableRow className="bg-card/40 hover:bg-card/40">
                        <TableCell colSpan={6} className="p-4">
                          <div className="rounded-lg border border-border/40 p-4 bg-black/80 space-y-2 max-h-[200px] overflow-y-auto font-mono text-xs">
                            <div className="text-[11px] font-bold text-cyan-400">Campaign #{c.id} Individual Contact Logs:</div>
                            {expandedLogs.length > 0 ? (
                              expandedLogs.map((log, idx) => (
                                <div key={idx} className="flex justify-between text-muted-foreground border-b border-border/20 py-1">
                                  <span>#{log.index + 1} {log.name} ({log.phone || log.email})</span>
                                  <span className={(log.status || "").includes("SUCCESS") ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                    {log.status || "PENDING"}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-muted-foreground italic">No detailed log entries found.</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}

              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    No campaigns launched yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ConfirmModal
        open={!!stopTargetId}
        onClose={() => setStopTargetId(null)}
        onConfirm={confirmStopCampaign}
        title="Stop Campaign Dispatch"
        description="Are you sure you want to stop this running campaign? Message sending will be halted immediately."
        confirmText="Stop Campaign"
        isDanger
      />
    </Card>
  );
}
