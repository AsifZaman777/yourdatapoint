"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Send, Phone, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { scraperApi, type ScrapedDataItem } from "@/lib/api/scraper";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ScrapedDataModalProps {
  jobId: number | null;
  open: boolean;
  onClose: () => void;
}

export function ScrapedDataModal({ jobId, open, onClose }: ScrapedDataModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ScrapedDataItem[]>([]);
  const [query, setQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!open || !jobId) return;

    setLoading(true);
    scraperApi
      .jobData(jobId)
      .then((res) => {
        setData(res.data.data || []);
        setQuery(res.data.query || `Job #${jobId}`);
      })
      .catch((err) => {
        toast.error("Failed to load scraped data records.");
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [open, jobId]);

  const filteredData = data.filter((item) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (item.Name && item.Name.toLowerCase().includes(term)) ||
      (item.Phone && item.Phone.toLowerCase().includes(term)) ||
      (item.Category && item.Category.toLowerCase().includes(term)) ||
      (item.Address && item.Address.toLowerCase().includes(term))
    );
  });

  const withPhoneCount = data.filter((d) => d.Phone && d.Phone.trim().length > 3).length;

  const handleUseInCampaign = () => {
    if (!jobId) return;
    onClose();
    router.push(`/marketing?tab=whatsapp&group=job_${jobId}`);
  };

  const handleDownloadExcel = () => {
    if (!jobId) return;
    const url = scraperApi.downloadJobUrl(jobId);
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col glass-panel border-cyan-500/30 p-6 overflow-hidden">
        <DialogHeader className="space-y-1 pb-3 border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>Private Scraped Catalogue Data</span>
              <Badge variant="outline" className="border-cyan-500/40 text-cyan-400 text-xs font-mono">
                Job #{jobId}
              </Badge>
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Search query: <span className="text-foreground font-semibold">"{query}"</span> — Previewing scraped business lead entries stored in your dataset.
          </DialogDescription>
        </DialogHeader>

        {/* Top Controls / Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by business name, phone, or area..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0 w-full sm:w-auto justify-end">
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 gap-1">
              <Phone className="h-3 w-3" /> {withPhoneCount} / {data.length} Leads with Phone
            </Badge>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto border border-border/40 rounded-lg bg-black/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="text-xs">Loading scraped dataset records...</span>
            </div>
          ) : filteredData.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-xs font-bold text-foreground">Business Name</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Phone Number</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Category</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Rating</TableHead>
                  <TableHead className="text-xs font-bold text-foreground">Address</TableHead>
                  <TableHead className="text-xs font-bold text-foreground text-right">Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, idx) => (
                  <TableRow key={idx} className="border-border/20 hover:bg-cyan-500/5 text-xs">
                    <TableCell className="font-semibold text-foreground max-w-[200px] truncate">
                      {row.Name || "N/A"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {row.Phone ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {row.Phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-[11px]">No Phone</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.Category || "N/A"}</TableCell>
                    <TableCell className="text-amber-400 font-mono">{row.Rating || "-"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[220px] truncate">
                      {row.Address ? (
                        <span className="flex items-center gap-1" title={row.Address}>
                          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{row.Address}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row["Maps URL"] ? (
                        <a
                          href={row["Maps URL"]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                        >
                          Maps <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 text-xs text-muted-foreground">
              {searchFilter ? "No matching records found for search filter." : "No records found in this dataset."}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground font-mono">
            Total Displayed: <span className="text-foreground font-bold">{filteredData.length}</span> items
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              disabled={data.length === 0}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Download Excel
            </Button>

            <Button
              size="sm"
              onClick={handleUseInCampaign}
              disabled={data.length === 0}
              className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Send className="h-3.5 w-3.5" /> Use in Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
