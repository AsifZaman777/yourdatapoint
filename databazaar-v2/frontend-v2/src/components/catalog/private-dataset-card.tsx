"use client";

import { Eye, Lock, Trash2, Play, Send, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/providers/language-provider";
import type { ScraperJob } from "@/lib/types";

interface PrivateDatasetCardProps {
  job: ScraperJob;
  onView: (jobId: number) => void;
  onUseLeads: (jobId: number) => void;
  onDelete: (jobId: number, query: string) => void;
  onPromote: (jobId: number, query: string) => void;
  isAdmin: boolean;
}

export function PrivateDatasetCard({
  job,
  onView,
  onUseLeads,
  onDelete,
  onPromote,
  isAdmin,
}: PrivateDatasetCardProps) {
  const { t } = useLanguage();
  const ct = t.catalog || {};

  return (
    <Card className="glass-panel border-cyan-500/30 hover:border-cyan-500/60 transition-all duration-300 flex flex-col justify-between">
      <CardContent className="p-5 space-y-3">
        <div className="flex justify-between items-center">
          <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 gap-1 text-[10px] font-bold">
            <Lock className="h-3 w-3" /> PRIVATE SCRAPED LEAD
          </Badge>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{job.id}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(job.id, job.query)}
              className="h-6 w-6 text-destructive hover:bg-destructive/10"
              title="Delete Scrape Job"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <h3 className="font-bold text-base text-foreground line-clamp-1">{job.query}</h3>

        <div className="space-y-1 text-xs text-muted-foreground font-mono">
          <div>Location: {job.area || job.district || "BD"}</div>
          <div className="text-emerald-400 font-bold">
            {ct.leadsParsed || "Leads parsed"}: {job.result_count || 0}
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3 border-t border-border/40 flex flex-col gap-2 bg-card/40">
        <div className="flex gap-2 w-full">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(job.id)}
            className="flex-1 gap-1 text-xs h-8"
          >
            <Eye className="h-3.5 w-3.5" /> {ct.btnView || "View"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onUseLeads(job.id)}
            className="flex-1 gap-1 text-xs h-8 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Play className="h-3.5 w-3.5" /> {ct.btnUseLeads || "Use Leads"}
          </Button>
        </div>

        {job.promotion_status === "pending" ? (
          <Button size="sm" variant="outline" disabled className="w-full text-xs h-8 text-amber-500 border-amber-500/30 gap-1">
            <Clock className="h-3.5 w-3.5" /> Promotion Pending
          </Button>
        ) : job.promotion_status === "approved" ? (
          <Button size="sm" variant="outline" disabled className="w-full text-xs h-8 text-emerald-400 border-emerald-500/30 gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Published to Catalog
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onPromote(job.id, job.query)}
            className="w-full text-xs h-8 gap-1 font-semibold"
          >
            <Send className="h-3.5 w-3.5" />
            {isAdmin ? (ct.btnPromoteAdmin || "Promote to Public Catalog") : (ct.btnPromote || "Request Catalog Promotion")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
