"use client";

import { useState, type FormEvent } from "react";
import { Search, Plus, Trash2, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

  const handleSubmit = async (e: FormEvent) => {
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

    setIsSubmitting(true);
    try {
      const res = await scraperApi.startScrape({
        queries: validQueries,
        query: validQueries[0],
        division: finalDivision,
        district: finalDistrict,
        area: finalArea,
        headless: !showLiveDebug,
      });

      toast.success(`Scrape job launched for ${validQueries.length} query(s)!`);
      onJobCreated(res.data.job_id);
      setQueries([""]);
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

          {/* Debug checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="live-debug"
              checked={showLiveDebug}
              onCheckedChange={(c) => setShowLiveDebug(!!c)}
            />
            <label htmlFor="live-debug" className="text-xs text-muted-foreground cursor-pointer">
              Enable real-time Headless Driver screenshot stream debugging
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
      </CardContent>
    </Card>
  );
}
