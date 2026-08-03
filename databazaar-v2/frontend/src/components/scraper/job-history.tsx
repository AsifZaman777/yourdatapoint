"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import {
  Eye,
  Send,
  Download,
  Trash2,
  Square,
  Clock,
  CheckCircle2,
  XCircle,
  Database,
  Search,
} from "lucide-react";
import { scraperApi } from "@/lib/api/scraper";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ScraperJob } from "@/lib/types";
import { ScrapedDataModal } from "./scraped-data-modal";

interface JobHistoryProps {
  jobs: ScraperJob[];
  onRefresh: () => void;
  activeJobId?: number | null;
  onViewLogs?: (jobId: number) => void;
}

export function JobHistory({ jobs, onRefresh, activeJobId, onViewLogs }: JobHistoryProps) {
  const router = useRouter();

  // Modal State for Data Preview
  const [previewJobId, setPreviewJobId] = useState<number | null>(null);

  // Modal State for Delete Confirm
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stopping state
  const [stoppingJobId, setStoppingJobId] = useState<number | null>(null);

  const handleStopJob = async (jobId: number) => {
    setStoppingJobId(jobId);
    try {
      await scraperApi.stopJob(jobId);
      toast.info(`Stop request sent for Job #${jobId}. Saving partial scraped records...`);
      setTimeout(onRefresh, 1500);
    } catch {
      toast.error("Failed to send stop signal.");
    } finally {
      setStoppingJobId(null);
    }
  };

  const confirmDeleteJob = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await scraperApi.deleteJob(deleteTargetId);
      toast.success(`Job #${deleteTargetId} deleted.`);
      setDeleteTargetId(null);
      onRefresh();
    } catch {
      toast.error("Failed to delete scrape job.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewData = async (jobId: number, queryName: string) => {
    try {
      toast.info("Adding scraped dataset to Private Catalogue...");
      await scraperApi.requestPromote(jobId, queryName, "Scraped Leads");
      toast.success("Added to Private Catalogue! Redirecting...");
      router.push(`/catalog?tab=private&job=${jobId}`);
    } catch {
      router.push(`/catalog?tab=private&job=${jobId}`);
    }
  };

  const handleUseInCampaign = (jobId: number) => {
    router.push(`/marketing?tab=whatsapp&group=job_${jobId}`);
  };

  const handleDownloadExcel = (jobId: number) => {
    const url = scraperApi.downloadJobUrl(jobId);
    window.open(url, "_blank");
  };

  return (
    <Card className="glass-panel p-6 border-cyan-500/30">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-foreground font-mono">
              Scraping Job History & Private Datasets ({jobs.length})
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs text-muted-foreground">
            Refresh List
          </Button>
        </div>

        <div className="border border-border/40 rounded-lg overflow-x-auto bg-black/30">
          {jobs.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-foreground w-[90px]">Job ID</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Search Query / Location</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Items Parsed</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Created At</TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-right min-w-[280px]">
                    Actions (View / Campaign / Download / Delete)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const isRunning = job.status === "running";
                  const isDone = job.status === "done" || job.status === "stopped";
                  const itemCount = job.result_count || 0;

                  return (
                    <TableRow key={job.id} className="border-border/20 hover:bg-cyan-500/5 text-xs">
                      <TableCell className="font-mono font-bold text-cyan-400">
                        #{job.id}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Search className="h-3 w-3 text-cyan-400 shrink-0" />
                            <span>{job.query}</span>
                          </div>
                          {(job.division || job.district || job.area) && (
                            <div className="text-[11px] text-muted-foreground">
                              {[job.division, job.district, job.area].filter(Boolean).join(", ")}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {isRunning && (
                          <Badge variant="outline" className="border-cyan-400/50 text-cyan-400 gap-1 text-[10px] animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                            Scraping Active
                          </Badge>
                        )}
                        {job.status === "done" && (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </Badge>
                        )}
                        {job.status === "stopped" && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-400 gap-1 text-[10px]">
                            <Square className="h-3 w-3" /> Stopped (Saved)
                          </Badge>
                        )}
                        {job.status === "failed" && (
                          <Badge variant="outline" className="border-destructive/40 text-destructive gap-1 text-[10px]">
                            <XCircle className="h-3 w-3" /> Failed
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="font-mono font-semibold text-foreground">
                        {itemCount > 0 ? (
                          <span className="text-emerald-400 font-bold">{itemCount} leads</span>
                        ) : (
                          <span className="text-muted-foreground/60">0</span>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground font-mono text-[11px]">
                        {job.created_at ? job.created_at.split(".")[0] : "-"}
                      </TableCell>

                      {/* 4 ACTION BUTTONS PER JOB */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* STOP BUTTON IF RUNNING */}
                          {isRunning && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={stoppingJobId === job.id}
                              onClick={() => handleStopJob(job.id)}
                              className="h-7 px-2 text-[11px] font-bold gap-1"
                              title="Stop scraping immediately & keep partial data"
                            >
                              <Square className="h-3 w-3" /> Stop Job
                            </Button>
                          )}

                          {/* 1. VIEW DATA BUTTON */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isDone || itemCount === 0}
                            onClick={() => handleViewData(job.id, job.query)}
                            className="h-7 px-2 text-[11px] gap-1 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                            title="View collected dataset in private catalogue"
                          >
                            <Eye className="h-3 w-3" /> View Data
                          </Button>

                          {/* 2. USE IN CAMPAIGN BUTTON */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isDone || itemCount === 0}
                            onClick={() => handleUseInCampaign(job.id)}
                            className="h-7 px-2 text-[11px] gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                            title="Use dataset for WhatsApp marketing campaign"
                          >
                            <Send className="h-3 w-3" /> Use
                          </Button>

                          {/* 3. DOWNLOAD EXCEL BUTTON */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isDone || itemCount === 0}
                            onClick={() => handleDownloadExcel(job.id)}
                            className="h-7 px-2 text-[11px] gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                            title="Download Excel spreadsheet"
                          >
                            <Download className="h-3 w-3" /> Download
                          </Button>

                          {/* 4. DELETE BUTTON */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTargetId(job.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete scrape job"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-xs text-muted-foreground">
              No scrape jobs launched yet. Use the form above to start Google Maps scraping.
            </div>
          )}
        </div>
      </CardContent>

      {/* Scraped Data Preview Modal */}
      <ScrapedDataModal
        jobId={previewJobId}
        open={previewJobId !== null}
        onClose={() => setPreviewJobId(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDeleteJob}
        title={`Delete Scrape Job #${deleteTargetId}?`}
        description="This action will permanently delete this scrape job, its output Excel file, and all associated execution logs."
        confirmText={isDeleting ? "Deleting..." : "Delete Job"}
        isDanger
      />
    </Card>
  );
}
