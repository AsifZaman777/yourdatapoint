"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { datasetsApi } from "@/lib/api/datasets";
import { useLanguage } from "@/providers/language-provider";
import type { DatasetDetail, User } from "@/lib/types";

interface DatasetDetailViewProps {
  detail: DatasetDetail;
  token: string;
  user: User | null;
  pageSize?: number;
  onBack: () => void;
  onUnlock: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSearch: (query: string) => void;
}

type LeadRow = Record<string, any>;

const columnHelper = createColumnHelper<LeadRow>();

export function DatasetDetailView({
  detail,
  token,
  user,
  pageSize,
  onBack,
  onUnlock,
  onPageChange,
  onPageSizeChange,
  onSearch,
}: DatasetDetailViewProps) {
  const { t } = useLanguage();
  const ct = t.catalog || {};
  const [searchQuery, setSearchQuery] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const { dataset, leads, unlocked } = detail;
  const pages_count = Math.max(1, Number(detail.pages_count || 1));
  const current_page = Math.max(1, Number(detail.current_page || 1));

  const handleSearchSubmit = () => {
    onSearch(searchQuery);
  };

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  // TanStack Table Column Definitions with Auto Text-Wrapping & Resizing
  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) =>
          row.Name ||
          row.name ||
          row["Business Name"] ||
          row["Company Name"] ||
          row["title"] ||
          "—",
        {
          id: "name",
          size: 220,
          minSize: 120,
          maxSize: 500,
          header: ({ column }) => (
            <div
              className="flex items-center justify-between gap-1.5 cursor-pointer select-none group py-1"
              onClick={column.getToggleSortingHandler()}
            >
              <span className="font-bold text-foreground">{ct.thName || "Business / Name"}</span>
              {{
                asc: <ArrowUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
                desc: <ArrowDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
              }[column.getIsSorted() as string] ?? (
                <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 shrink-0" />
              )}
            </div>
          ),
          cell: (info) => (
            <div className="font-semibold text-foreground text-xs leading-normal whitespace-pre-wrap break-words">
              {String(info.getValue())}
            </div>
          ),
        }
      ),
      columnHelper.accessor(
        (row) =>
          row.Phone ||
          row.phone ||
          row["Contact"] ||
          row["Mobile"] ||
          row["Contact / Mobile"] ||
          "No contact",
        {
          id: "phone",
          size: 160,
          minSize: 100,
          maxSize: 350,
          header: ({ column }) => (
            <div
              className="flex items-center justify-between gap-1.5 cursor-pointer select-none group py-1"
              onClick={column.getToggleSortingHandler()}
            >
              <span className="font-bold text-foreground">{ct.thContact || "Contact / Mobile"}</span>
              {{
                asc: <ArrowUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
                desc: <ArrowDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
              }[column.getIsSorted() as string] ?? (
                <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 shrink-0" />
              )}
            </div>
          ),
          cell: (info) => (
            <div
              className={`font-mono text-xs leading-normal whitespace-pre-wrap break-words ${
                !unlocked ? "italic text-muted-foreground" : "text-emerald-400 font-bold"
              }`}
            >
              {String(info.getValue())}
            </div>
          ),
        }
      ),
      columnHelper.accessor(
        (row) =>
          row.Email ||
          row.email ||
          row["E-mail"] ||
          row["Contact Email"] ||
          row["Mail"] ||
          "",
        {
          id: "email",
          size: 200,
          minSize: 120,
          maxSize: 450,
          header: ({ column }) => (
            <div
              className="flex items-center justify-between gap-1.5 cursor-pointer select-none group py-1"
              onClick={column.getToggleSortingHandler()}
            >
              <span className="font-bold text-foreground">{ct.thEmail || "Email Address"}</span>
              {{
                asc: <ArrowUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
                desc: <ArrowDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
              }[column.getIsSorted() as string] ?? (
                <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 shrink-0" />
              )}
            </div>
          ),
          cell: (info) => {
            const emailVal = String(info.getValue());
            if (!unlocked) {
              return <span className="italic text-muted-foreground text-xs">Locked</span>;
            }
            if (emailVal) {
              return (
                <a
                  href={`mailto:${emailVal}`}
                  className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-start gap-1 whitespace-normal break-all leading-normal"
                >
                  <Mail className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{emailVal}</span>
                </a>
              );
            }
            return <span className="text-muted-foreground text-xs">—</span>;
          },
        }
      ),
      columnHelper.accessor(
        (row) => row.Address || row.address || row["Location"] || row["location"] || "—",
        {
          id: "address",
          size: 250,
          minSize: 130,
          maxSize: 600,
          header: ({ column }) => (
            <div
              className="flex items-center justify-between gap-1.5 cursor-pointer select-none group py-1"
              onClick={column.getToggleSortingHandler()}
            >
              <span className="font-bold text-foreground">{ct.thAddress || "Address / Location"}</span>
              {{
                asc: <ArrowUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
                desc: <ArrowDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
              }[column.getIsSorted() as string] ?? (
                <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 shrink-0" />
              )}
            </div>
          ),
          cell: (info) => (
            <div className="text-xs text-muted-foreground leading-normal whitespace-pre-wrap break-words">
              {String(info.getValue())}
            </div>
          ),
        }
      ),
      columnHelper.accessor(
        (row) => row.Website || row.website || row["URL"] || row["url"] || row["Web"] || "",
        {
          id: "website",
          size: 160,
          minSize: 100,
          maxSize: 400,
          header: () => (
            <span className="font-bold text-foreground block">{ct.thWebsite || "Website URL"}</span>
          ),
          cell: (info) => {
            const websiteVal = String(info.getValue());
            if (!websiteVal) {
              return <span className="text-muted-foreground text-xs">—</span>;
            }
            const href = websiteVal.startsWith("http") ? websiteVal : `https://${websiteVal}`;
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-cyan-400 hover:underline inline-flex items-start gap-1 whitespace-normal break-all leading-normal"
              >
                <Globe className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{websiteVal.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-70 shrink-0 mt-0.5" />
              </a>
            );
          },
        }
      ),
      columnHelper.accessor(
        (row) =>
          row.Maps ||
          row["Google Maps"] ||
          row["Maps Link"] ||
          row["map_url"] ||
          row["link"] ||
          row["Link"] ||
          "",
        {
          id: "maps",
          size: 130,
          minSize: 90,
          maxSize: 300,
          header: () => (
            <span className="font-bold text-foreground block">{ct.thMaps || "Google Maps"}</span>
          ),
          cell: (info) => {
            const mapsVal = String(info.getValue());
            if (!mapsVal) {
              return <span className="text-muted-foreground text-xs">—</span>;
            }
            const href = mapsVal.startsWith("http") ? mapsVal : `https://${mapsVal}`;
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold whitespace-normal break-all leading-normal"
              >
                <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                <span>Maps Link</span>
                <ExternalLink className="h-2.5 w-2.5 opacity-70 shrink-0" />
              </a>
            );
          },
        }
      ),
      columnHelper.accessor(
        (row) => row.Rating || row.rating || row["Reviews"] || row["Category"] || row["category"] || "—",
        {
          id: "rating",
          size: 140,
          minSize: 90,
          maxSize: 300,
          header: ({ column }) => (
            <div
              className="flex items-center justify-between gap-1.5 cursor-pointer select-none group py-1"
              onClick={column.getToggleSortingHandler()}
            >
              <span className="font-bold text-foreground">{ct.thRating || "Rating / Category"}</span>
              {{
                asc: <ArrowUp className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
                desc: <ArrowDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />,
              }[column.getIsSorted() as string] ?? (
                <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100 shrink-0" />
              )}
            </div>
          ),
          cell: (info) => (
            <div className="text-xs font-mono whitespace-pre-wrap break-words leading-normal">
              {String(info.getValue())}
            </div>
          ),
        }
      ),
    ],
    [ct, unlocked]
  );

  // Initialize TanStack React Table with Auto Content Wrapping, Drag Resizing, Sorting & Instant Filtering
  const table = useReactTable({
    data: leads || [],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

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

          {/* Instant Client Filter (TanStack Filter) */}
          <div className="flex items-center gap-2 max-w-xs">
            <Filter className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search table leads..."
              className="h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* TanStack React Table Container with Draggable Column Resizing and Text-Wrapping */}
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
          <Table className="w-full table-fixed">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="relative group/head py-3 px-3 select-none border-r border-border/20 last:border-r-0 align-top"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}

                      {/* Draggable Column Resizer Bar */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none hover:bg-cyan-400 opacity-0 group-hover/head:opacity-100 transition-opacity z-20 ${
                            header.column.getIsResizing() ? "bg-cyan-400 opacity-100 w-2" : "bg-border/60"
                          }`}
                          title="Drag to resize column"
                        />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-3 px-3 border-r border-border/20 last:border-r-0 align-top break-words"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground text-xs">
                    {ct.noRecords || "No records found in this dataset view."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination & Rows Per Page Controls */}
      {unlocked && (
        <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <div>
              Showing Page <strong className="text-cyan-400">{current_page}</strong> of <strong className="text-foreground">{pages_count}</strong> ({dataset.row_count || leads.length} Total Leads)
            </div>

            {/* Rows Per Page Selector */}
            {onPageSizeChange && (
              <div className="flex items-center gap-1.5 ml-2 border-l border-border/40 pl-4">
                <span className="text-[11px] text-muted-foreground">Rows per page:</span>
                <Select
                  value={String(pageSize || 25)}
                  onValueChange={(val) => onPageSizeChange(Number(val))}
                >
                  <SelectTrigger className="h-7 w-[70px] text-xs font-semibold bg-background/50">
                    <SelectValue placeholder="25" />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={current_page <= 1}
              onClick={() => onPageChange(current_page - 1)}
              className="h-8 gap-1 text-xs font-semibold"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {ct.prevBtn || "Prev"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={current_page >= pages_count}
              onClick={() => onPageChange(current_page + 1)}
              className="h-8 gap-1 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20"
            >
              {ct.nextBtn || "Next"}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
