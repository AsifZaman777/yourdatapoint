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
  Globe,
  MapPin,
  ExternalLink,
  Mail,
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold whitespace-nowrap">{ct.thName || "Business / Name"}</TableHead>
                <TableHead className="font-bold whitespace-nowrap">{ct.thContact || "Contact / Mobile"}</TableHead>
                <TableHead className="font-bold whitespace-nowrap">{ct.thEmail || "Email Address"}</TableHead>
                <TableHead className="font-bold whitespace-nowrap">{ct.thAddress || "Address / Location"}</TableHead>
                <TableHead className="font-bold whitespace-nowrap">{ct.thWebsite || "Website URL"}</TableHead>
                <TableHead className="font-bold whitespace-nowrap">{ct.thMaps || "Google Maps"}</TableHead>
                <TableHead className="font-bold whitespace-nowrap">{ct.thRating || "Rating / Category"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads && leads.length > 0 ? (
                leads.map((row, idx) => {
                  const nameVal =
                    row.Name ||
                    row.name ||
                    row["Business Name"] ||
                    row["Company Name font-bold"] ||
                    row["title"] ||
                    "—";

                  const phoneVal =
                    row.Phone ||
                    row.phone ||
                    row["Contact"] ||
                    row["Mobile"] ||
                    row["Contact / Mobile"] ||
                    "No contact";

                  const emailVal =
                    row.Email ||
                    row.email ||
                    row["E-mail"] ||
                    row["Contact Email"] ||
                    row["Mail"] ||
                    "";

                  const addressVal =
                    row.Address || row.address || row["Location"] || row["location"] || "—";

                  const websiteVal =
                    row.Website || row.website || row["URL"] || row["url"] || row["Web"] || "";

                  const mapsVal =
                    row.Maps ||
                    row["Google Maps"] ||
                    row["Maps Link"] ||
                    row["map_url"] ||
                    row["link"] ||
                    row["Link"] ||
                    "";

                  const ratingVal =
                    row.Rating || row.rating || row["Reviews"] || row["Category"] || row["category"] || "—";

                  return (
                    <TableRow key={idx}>
                      {/* Name */}
                      <TableCell className="font-semibold text-foreground whitespace-nowrap">{nameVal}</TableCell>

                      {/* Contact / Mobile */}
                      <TableCell className={`font-mono text-xs whitespace-nowrap ${!unlocked ? "italic text-muted-foreground" : "text-emerald-400 font-bold"}`}>
                        {phoneVal}
                      </TableCell>

                      {/* Email Address */}
                      <TableCell className="text-xs font-mono text-cyan-400 whitespace-nowrap">
                        {!unlocked ? (
                          <span className="italic text-muted-foreground">Locked</span>
                        ) : emailVal ? (
                          <a href={`mailto:${emailVal}`} className="hover:underline inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {emailVal}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Address */}
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={addressVal}>
                        {addressVal}
                      </TableCell>

                      {/* Website URL */}
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {websiteVal ? (
                          <a
                            href={websiteVal.startsWith("http") ? websiteVal : `https://${websiteVal}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" />
                            <span className="max-w-[120px] truncate">{websiteVal.replace(/^https?:\/\//, "")}</span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Google Maps Link */}
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {mapsVal ? (
                          <a
                            href={mapsVal.startsWith("http") ? mapsVal : `https://${mapsVal}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <MapPin className="h-3 w-3 text-cyan-400" />
                            Maps Link
                            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Rating / Category */}
                      <TableCell className="text-xs font-mono whitespace-nowrap">{ratingVal}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs">
                    {ct.noRecords || "No records found in this dataset."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
