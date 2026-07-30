"use client";

import { useState, type FormEvent } from "react";
import { Upload, Plus, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api/admin";
import { toast } from "sonner";
import type { RegionsConfig } from "@/lib/types";

interface DatasetUploadFormProps {
  categoriesList: string[];
  regionsConfig: RegionsConfig | null;
  onSuccess: () => void;
}

export function DatasetUploadForm({
  categoriesList,
  regionsConfig,
  onSuccess,
}: DatasetUploadFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(10);
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");
  const [file, setFile] = useState<File | null>(null);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.warning("Please upload a CSV or Excel file.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("price_credits", price.toString());
    if (division) formData.append("division", division);
    if (district) formData.append("district", district);
    if (area) formData.append("area", area);
    formData.append("file", file);

    setIsSubmitting(true);
    try {
      await adminApi.uploadDataset(formData);
      toast.success("Dataset created and published to public catalog!");
      setName("");
      setCategory("");
      setPrice(10);
      setDivision("");
      setDistrict("");
      setArea("");
      setFile(null);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-panel p-6 border-cyan-500/30">
      <CardContent className="p-0 space-y-6">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <Upload className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-foreground">Upload Public Dataset (CSV / Excel)</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dataset Title *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Coaching Centers Dhaka 2026"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category *</Label>
              <Select value={category} onValueChange={(val) => setCategory(val || "")} required>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="-- Choose Category --" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesList.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price & File */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Price in Credits (0 = FREE)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                required
                min={0}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target File (.csv, .xlsx) *</Label>
              <Input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="text-xs h-9"
              />
            </div>
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

          <Button type="submit" disabled={isSubmitting} className="w-full font-bold gap-2 py-5">
            <FileSpreadsheet className="h-4 w-4" />
            {isSubmitting ? "Uploading & Processing..." : "Upload & Create Public Dataset"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
