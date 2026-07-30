"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Unlock,
  Coins,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Database as DatabaseIcon,
  Download,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { datasetsApi } from "@/lib/api/datasets";
import { useLanguage } from "@/providers/language-provider";
import type { DatasetDetail, User } from "@/lib/types";

interface DatasetDetailViewProps {
  detail: DatasetDetail;
  token: string;
  user: User | null;
  onBack: () => void;
  onUnlock: () => void;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
}

export function DatasetDetailView({
  detail,
  token,
  user,
  onBack,
  onUnlock,
  onPageChange,
  onSearch,
}: DatasetDetailViewProps) {
  const { t } = useLanguage();
  const ct = t.catalog || {};
  const [searchQuery, setSearchQuery] = useState("");
  const { dataset, leads, unlocked, pages_count, current_page } = detail;

  const handleSearchSubmit = () => {
    onSearch(searchQuery);
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Button variant="outline" size="sm" onClick={onBack} className="gap-2 text-xs">
        <ArrowLeft className="h-4 w-4" /> {ct.backToCatalog || "Back to Catalog"}
      </Button>

      {/* Dataset Header Card */}
      <Card className="glass-panel p-6">
        <CardContent className="p-0 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">{dataset.name}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Category: <strong className="text-foreground">{dataset.category}</strong> | {ct.leadsParsed || "Leads"}:{" "}
                <strong className="text-foreground">{dataset.row_count}</strong> | {ct.covering || "Region"}:{" "}
                <strong className="text-foreground">{dataset.area || dataset.district || dataset.division || "BD"}</strong>
              </p>
            </div>

            {!unlocked ? (
              <Button onClick={onUnlock} className="gap-2 font-bold bg-amber-500 text-black hover:bg-amber-600">
                <Unlock className="h-4 w-4" />
                {ct.unlockTitle || "Unlock Full Leads"} (<Coins className="h-3.5 w-3.5" /> {dataset.price_credits} credits)
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 gap-1 text-xs py-1">
                  <CheckCircle2 className="h-4 w-4" /> {ct.unlockedAccess || "Unlocked Access"}
                </Badge>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <a
                      href={datasetsApi.exportUrl(dataset.id, "excel", token)}
                      download
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                    </a>
                    <a
                      href={datasetsApi.exportUrl(dataset.id, "csv", token)}
                      download
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-cyan-500/40 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20"
                    >
                      <FileText className="h-3.5 w-3.5" /> CSV
                    </a>
                    <a
                      href={datasetsApi.exportUrl(dataset.id, "json", token)}
                      download
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-purple-500/40 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                    >
                      <DatabaseIcon className="h-3.5 w-3.5" /> JSON
                    </a>
                    <a
                      href={datasetsApi.exportUrl(dataset.id, "pdf", token)}
                      download
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border border-destructive/40 text-destructive bg-destructive/10 hover:bg-destructive/20"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search inside leads */}
          <div className="flex gap-2 max-w-sm">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ct.searchLeadsPlaceholder || "Search inside leads..."}
              className="h-9 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            />
            <Button size="sm" onClick={handleSearchSubmit} className="gap-1 text-xs h-9">
              <Search className="h-3.5 w-3.5" /> {ct.searchBtn || "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table Container */}
      <Card className="glass-panel overflow-hidden relative">
        {/* Watermark overlay if unlocked */}
        {unlocked && user && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-10 text-[10px] font-mono text-foreground grid grid-cols-4 gap-8 p-4 select-none">
            {Array(20)
              .fill(user.email)
              .map((mail, idx) => (
                <div key={idx} className="-rotate-12 whitespace-nowrap font-bold">
                  <div>{mail}</div>
                  <div>{new Date().toLocaleString()}</div>
                </div>
              ))}
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">{ct.thName || "Business / Name"}</TableHead>
              <TableHead className="font-bold">{ct.thContact || "Contact / Mobile"}</TableHead>
              <TableHead className="font-bold">{ct.thAddress || "Address / Location"}</TableHead>
              <TableHead className="font-bold">{ct.thWebsite || "Website"}</TableHead>
              <TableHead className="font-bold">{ct.thRating || "Rating"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads && leads.length > 0 ? (
              leads.map((row, idx) => {
                const nameVal =
                  row.Name ||
                  row.name ||
                  row["Business Name"] ||
                  row["Company Name"] ||
                  "—";
                const phoneVal =
                  row.Phone ||
                  row.phone ||
                  row["Contact"] ||
                  row["Mobile"] ||
                  row["Contact / Mobile"] ||
                  "No contact";
                const addressVal =
                  row.Address || row.address || row["Location"] || "—";
                const websiteVal =
                  row.Website || row.website || row["URL"] || "";
                const ratingVal =
                  row.Rating || row.rating || row["Reviews"] || "—";

                return (
                  <TableRow key={idx}>
                    <TableCell className="font-semibold text-foreground">{nameVal}</TableCell>
                    <TableCell className={`font-mono text-xs ${!unlocked ? "italic text-muted-foreground" : "text-emerald-400 font-bold"}`}>
                      {phoneVal}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{addressVal}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {websiteVal ? (
                        <a href={websiteVal} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                          URL
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{ratingVal}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs">
                  {ct.noRecords || "No records found in this dataset."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination Controls */}
      {unlocked && pages_count > 1 && (
        <div className="flex justify-center items-center gap-4 pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={current_page <= 1}
            onClick={() => onPageChange(current_page - 1)}
          >
            {ct.prevBtn || "Prev"}
          </Button>
          <span className="text-xs font-mono text-muted-foreground">
            {ct.pageText || "Page"} {current_page} {ct.ofText || "of"} {pages_count}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={current_page >= pages_count}
            onClick={() => onPageChange(current_page + 1)}
          >
            {ct.nextBtn || "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}
