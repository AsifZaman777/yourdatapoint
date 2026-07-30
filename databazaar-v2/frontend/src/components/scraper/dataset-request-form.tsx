"use client";

import { useState, type FormEvent } from "react";
import { Inbox, Plus, Trash2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestsApi } from "@/lib/api/requests";
import { toast } from "sonner";
import type { RegionsConfig } from "@/lib/types";

interface DatasetRequestFormProps {
  regionsConfig: RegionsConfig | null;
  onRequestSubmitted: () => void;
}

export function DatasetRequestForm({
  regionsConfig,
  onRequestSubmitted,
}: DatasetRequestFormProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const divisions = regionsConfig ? Object.keys(regionsConfig) : [];
  const districts =
    regionsConfig && division && regionsConfig[division]
      ? Object.keys(regionsConfig[division])
      : [];
  const areas =
    regionsConfig && division && district && regionsConfig[division]?.[district]
      ? regionsConfig[division][district]
      : [];

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const allQueries = [...tags];
    if (tagInput.trim() && !allQueries.includes(tagInput.trim())) {
      allQueries.push(tagInput.trim());
    }

    if (allQueries.length === 0) {
      toast.warning("Please add at least one query tag.");
      return;
    }
    if (!phone.trim()) {
      toast.warning("Please enter your contact phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestsApi.submit({
        category_query: allQueries.join(", "),
        division,
        district,
        area,
        business_name: businessName,
        phone,
        additional_notes: notes,
      });

      toast.success(res.data.message || "Dataset request submitted!");
      setTags([]);
      setTagInput("");
      setDivision("");
      setDistrict("");
      setArea("");
      setBusinessName("");
      setPhone("");
      setNotes("");
      onRequestSubmitted();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-panel p-6 border-amber-500/30">
      <CardContent className="p-0 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <Inbox className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Submit Dataset Custom Request</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Query tags input */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Data Category / Search Queries *</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. Restaurants, Garments, Coaching..."
                className="text-xs h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag} className="h-9 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Tag
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-medium"
                  >
                    {t}
                    <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Location Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Division</Label>
              <Select value={division} onValueChange={(val) => setDivision(val || "")}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">District</Label>
              <Select value={district} disabled={!division} onValueChange={(val) => setDistrict(val || "")}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Area / City</Label>
              <Select value={area} disabled={!district} onValueChange={(val) => setArea(val || "")}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Business Name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your Company Name"
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Phone *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1XXXXXXXXX"
                required
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Additional Instructions / Requirements</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Target row counts, specific criteria..."
              rows={3}
              className="text-xs"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full font-bold gap-2 py-5 bg-amber-500 text-black hover:bg-amber-600">
            <Send className="h-4 w-4" />
            {isSubmitting ? "Submitting Request..." : "Submit Dataset Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
