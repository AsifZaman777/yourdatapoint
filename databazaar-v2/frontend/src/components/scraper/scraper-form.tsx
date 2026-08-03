"use client";

import { useState, type FormEvent } from "react";
import { Search, Plus, Trash2, Zap, Coins, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { scraperApi } from "@/lib/api/scraper";
import { toast } from "sonner";
import type { RegionsConfig } from "@/lib/types";

interface ScraperFormProps {
  regionsConfig: RegionsConfig | null;
  onJobCreated: (jobId: number) => void;
  cooldownRemaining: number;
}

export function ScraperForm({
  regionsConfig,
  onJobCreated,
  cooldownRemaining,
}: ScraperFormProps) {
  const [queries, setQueries] = useState<string[]>([""]);
  const [division, setDivision] = useState("");
  const [customDivision, setCustomDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [customDistrict, setCustomDistrict] = useState("");
  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [showLiveDebug, setShowLiveDebug] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingScrapeData, setPendingScrapeData] = useState<{
    queries: string[];
    division: string;
    district: string;
    area: string;
  } | null>(null);

  const divisions = regionsConfig ? Object.keys(regionsConfig) : [];
  const districts =
    regionsConfig && division && division !== "Other" && regionsConfig[division]
      ? Object.keys(regionsConfig[division])
      : regionsConfig
        ? Array.from(new Set(Object.values(regionsConfig).flatMap((d) => Object.keys(d))))
        : [];
  const areas =
    regionsConfig && division && division !== "Other" && district && district !== "Other" && regionsConfig[division]?.[district]
      ? regionsConfig[division][district]
      : regionsConfig
        ? Array.from(new Set(Object.values(regionsConfig).flatMap((d) => Object.values(d).flat())))
        : [];

  const handleDivisionChange = (val: string) => {
    setDivision(val || "");
    setCustomDivision("");
    setDistrict("");
    setCustomDistrict("");
    setArea("");
    setCustomArea("");
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val || "");
    setCustomDistrict("");
    setArea("");
    setCustomArea("");
  };

  const handleAreaChange = (val: string) => {
    setArea(val || "");
    setCustomArea("");
  };

  const handleAddQuery = () => {
    setQueries([...queries, ""]);
  };

  const handleRemoveQuery = (index: number) => {
    setQueries(queries.filter((_, i) => i !== index));
  };

  const handleQueryChange = (index: number, val: string) => {
    const next = [...queries];
    next[index] = val;
    setQueries(next);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (cooldownRemaining > 0) {
      toast.warning(`Rate limit cooldown active (${cooldownRemaining}s remaining).`);
      return;
    }

    const validQueries = queries.map((q) => q.trim()).filter(Boolean);
    if (validQueries.length === 0) {
      toast.warning("Please enter at least one search query.");
      return;
    }

    const finalDivision = division === "Other" ? customDivision.trim() : division;
    const finalDistrict = district === "Other" ? customDistrict.trim() : district;
    const finalArea = area === "Other" ? customArea.trim() : area;

    setPendingScrapeData({
      queries: validQueries,
      division: finalDivision,
      district: finalDistrict,
      area: finalArea,
    });
    setShowConfirmModal(true);
  };

  const executeLaunchScrape = async () => {
    if (!pendingScrapeData) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      const res = await scraperApi.startScrape({
        queries: pendingScrapeData.queries,
        query: pendingScrapeData.queries[0],
        division: pendingScrapeData.division,
        district: pendingScrapeData.district,
        area: pendingScrapeData.area,
        headless: true, // Always run in silent background mode (No Chrome GUI window)
      });

      toast.success(`Scrape job launched for ${pendingScrapeData.queries.length} query(s)!`);
      onJobCreated(res.data.job_id);
      setQueries([""]);
      setPendingScrapeData(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to launch scraper.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-panel p-6">
      <CardContent className="p-0 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <Zap className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Google Maps Live Scraper Console</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Queries Inputs */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Search Queries *</Label>
            {queries.map((q, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={q}
                  onChange={(e) => handleQueryChange(i, e.target.value)}
                  placeholder="e.g. Pharmacy in Dhanmondi, Dhaka"
                  className="text-xs h-9"
                  required={i === 0}
                />
                {queries.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleRemoveQuery(i)}
                    className="h-9 w-9 text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddQuery}
              className="gap-1 text-xs mt-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Search Query Tag
            </Button>
          </div>

          {/* Region Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Division */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Division</Label>
              <Select value={division} onValueChange={(val) => handleDivisionChange(val || "")}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {division === "Other" && (
                <Input
                  value={customDivision}
                  onChange={(e) => setCustomDivision(e.target.value)}
                  placeholder="Type custom division..."
                  className="text-xs h-9 mt-1.5 border-primary/50"
                />
              )}
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">District</Label>
              <Select value={district} disabled={!division} onValueChange={(val) => handleDistrictChange(val || "")}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {district === "Other" && (
                <Input
                  value={customDistrict}
                  onChange={(e) => setCustomDistrict(e.target.value)}
                  placeholder="Type custom district..."
                  className="text-xs h-9 mt-1.5 border-primary/50"
                />
              )}
            </div>

            {/* Area / City */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Area / City</Label>
              <Select value={area} disabled={!district} onValueChange={(val) => handleAreaChange(val || "")}>
                <SelectTrigger className="w-full text-xs h-9">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {area === "Other" && (
                <Input
                  value={customArea}
                  onChange={(e) => setCustomArea(e.target.value)}
                  placeholder="Type custom area..."
                  className="text-xs h-9 mt-1.5 border-primary/50"
                />
              )}
            </div>
          </div>

          {/* Stream option */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="live-debug"
              checked={showLiveDebug}
              onCheckedChange={(c) => setShowLiveDebug(!!c)}
            />
            <label htmlFor="live-debug" className="text-xs text-muted-foreground cursor-pointer">
              Background Headless Mode Active — Live WebSocket frames streamed in Console (No Chrome GUI window)
            </label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting || cooldownRemaining > 0}
            className="w-full font-bold gap-2 py-5"
          >
            <Search className="h-4 w-4" />
            {cooldownRemaining > 0
              ? `Cooldown Active (${cooldownRemaining}s)`
              : isSubmitting
                ? "Launching Scraper Job..."
                : "Launch Scraper Job"}
          </Button>
        </form>

        {/* Confirmation Modal */}
        <Dialog open={showConfirmModal} onOpenChange={(open) => !open && setShowConfirmModal(false)}>
          <DialogContent className="glass-panel border-border/40 sm:max-w-md">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2 text-amber-500">
                <div className="p-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Coins className="h-5 w-5" />
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Confirm Scraper Launch & Credit Deduction
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Starting this live web scraping job will deduct credits from your account balance.
              </DialogDescription>
            </DialogHeader>

            {pendingScrapeData && (
              <div className="space-y-3 py-3 border-y border-border/40 my-1">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">Target Queries ({pendingScrapeData.queries.length}):</span>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto">
                    {pendingScrapeData.queries.map((q, idx) => (
                      <span key={idx} className="text-[11px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>

                {(pendingScrapeData.division || pendingScrapeData.district || pendingScrapeData.area) && (
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span className="font-semibold">Region Filter:</span>
                    <span>
                      {[pendingScrapeData.division, pendingScrapeData.district, pendingScrapeData.area].filter(Boolean).join(" → ")}
                    </span>
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">Total Deduction:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-amber-500">
                      {pendingScrapeData.queries.length * 20} Credits
                    </span>
                    <p className="text-[10px] text-muted-foreground">({pendingScrapeData.queries.length} queries × 20 credits/query)</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 border-t-0 bg-transparent">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={executeLaunchScrape}
                disabled={isSubmitting}
                className="text-xs font-bold gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950"
              >
                <Coins className="h-3.5 w-3.5" />
                Confirm & Launch ({((pendingScrapeData?.queries.length || 0) * 20)} Credits)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
