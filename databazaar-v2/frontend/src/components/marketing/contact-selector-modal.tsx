"use client";

import { useState } from "react";
import { User, Search, CheckCircle2, XCircle, Phone, Mail, MapPin, AlertTriangle, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { RecipientContact } from "@/lib/types";

interface ContactSelectorModalProps {
  open: boolean;
  onClose: () => void;
  contacts: RecipientContact[];
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
}

export function ContactSelectorModal({
  open,
  onClose,
  contacts,
  selectedIds,
  onSelectionChange,
}: ContactSelectorModalProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "phone" | "email">("all");

  const validPhoneCount = contacts.filter((c) => Boolean(c.phone && c.phone.trim())).length;
  const invalidPhoneCount = contacts.length - validPhoneCount;

  const validEmailCount = contacts.filter((c) => Boolean(c.email && c.email.trim())).length;
  const invalidEmailCount = contacts.length - validEmailCount;

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "phone") return Boolean(c.phone && c.phone.trim());
    if (filterType === "email") return Boolean(c.email && c.email.trim());

    return true;
  });

  const handleToggle = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    filtered.forEach((c) => next.add(c.id));
    onSelectionChange(next);
  };

  const handleDeselectAllFiltered = () => {
    const next = new Set(selectedIds);
    filtered.forEach((c) => next.delete(c.id));
    onSelectionChange(next);
  };

  const selectedCount = selectedIds.size;
  const totalCount = contacts.length;
  const percentage = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden p-6 flex flex-col sm:max-w-6xl border border-cyan-500/20 shadow-2xl">
        <DialogHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <span>Granular Target Lead Selector & Inspector</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Inspect lead attributes and customize recipient target list for maximum campaign conversion
                </p>
              </div>
            </DialogTitle>

            <Badge variant="outline" className="font-mono text-xs py-1 px-3 border-cyan-500/40 text-cyan-400 bg-cyan-500/5">
              {totalCount} Leads Loaded
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 flex flex-col overflow-hidden">
          {/* Search & Selection Controls Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-card/40 p-3 rounded-xl border border-border/40">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads by name, phone, email, location..."
                className="pl-9 text-xs h-9 bg-background/80"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Quick Filter Pills with Valid & Invalid Counters */}
            <div className="flex items-center gap-1.5 bg-background/60 p-1 rounded-lg border border-border/40">
              <Button
                size="sm"
                variant={filterType === "all" ? "secondary" : "ghost"}
                onClick={() => setFilterType("all")}
                className="text-xs h-7 px-2.5 font-medium"
              >
                All ({contacts.length})
              </Button>
              <Button
                size="sm"
                variant={filterType === "phone" ? "secondary" : "ghost"}
                onClick={() => setFilterType("phone")}
                className="text-xs h-7 px-2.5 gap-1.5 font-medium"
              >
                <Phone className="h-3 w-3 text-emerald-400" /> Phone Valid ({validPhoneCount})
                {invalidPhoneCount > 0 && (
                  <span className="text-[11px] text-rose-400 font-mono font-semibold ml-0.5">
                    (-{invalidPhoneCount})
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant={filterType === "email" ? "secondary" : "ghost"}
                onClick={() => setFilterType("email")}
                className="text-xs h-7 px-2.5 gap-1.5 font-medium"
              >
                <Mail className="h-3 w-3 text-purple-400" /> Email Valid ({validEmailCount})
                {invalidEmailCount > 0 && (
                  <span className="text-[11px] text-rose-400 font-mono font-semibold ml-0.5">
                    (-{invalidEmailCount})
                  </span>
                )}
              </Button>
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAllFiltered}
                className="text-xs h-8 gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Select All ({filtered.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeselectAllFiltered}
                className="text-xs h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-3.5 w-3.5" /> Unselect All
              </Button>
            </div>
          </div>



          {/* Dynamic Selection Dashboard Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-background to-cyan-950/20 border border-cyan-500/30 flex flex-wrap gap-4 justify-between items-center text-xs">
            <div className="flex items-center gap-3">
              <div className="font-mono text-sm font-semibold">
                <span className="text-cyan-400 text-base">{selectedCount}</span> / {totalCount} Leads Target Active
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-mono">
                {percentage}% Target Selected
              </Badge>
            </div>

            {/* Selection Progress Bar */}
            <div className="flex-1 max-w-xs h-2 bg-secondary/80 rounded-full overflow-hidden border border-border/40">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Granular Contacts Table */}
          <div className="rounded-xl border border-border/50 overflow-hidden bg-background/60 flex-1 flex flex-col min-h-[320px]">
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-md">
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id))}
                        onCheckedChange={(c) => (c ? handleSelectAllFiltered() : handleDeselectAllFiltered())}
                      />
                    </TableHead>
                    <TableHead className="w-16 font-mono text-[11px]">ID</TableHead>
                    <TableHead className="text-xs font-semibold">Lead / Business Name</TableHead>
                    <TableHead className="text-xs font-semibold">Phone Number</TableHead>
                    <TableHead className="text-xs font-semibold">Email Address</TableHead>
                    <TableHead className="text-xs font-semibold">Location / Area</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Target Status</TableHead>
                    <TableHead className="text-xs font-semibold text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Filter className="h-8 w-8 text-muted-foreground/40" />
                          <p className="font-semibold text-sm">No lead contacts match your active filter query</p>
                          <p className="text-xs">Select a different dataset or clear search parameters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => {
                      const isChecked = selectedIds.has(c.id);
                      return (
                        <TableRow
                          key={c.id}
                          onClick={() => handleToggle(c.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked ? "bg-cyan-500/10 hover:bg-cyan-500/15" : "hover:bg-muted/30"
                          }`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                            <Checkbox checked={isChecked} onCheckedChange={() => handleToggle(c.id)} />
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            #{c.id + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-xs text-foreground">
                            {c.name}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-cyan-400">
                            {c.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                                {c.phone}
                              </span>
                            ) : (
                              <span className="text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                Missing Phone
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-purple-300">
                            {c.email ? (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <Mail className="h-3 w-3 text-purple-400 shrink-0" />
                                {c.email}
                              </span>
                            ) : (
                              <span className="text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                Missing Email
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                              {c.area || "Bangladesh"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {isChecked ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40 text-[10px] py-0.5">
                                ✓ INCLUDE
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground py-0.5">
                                EXCLUDE
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant={isChecked ? "outline" : "default"}
                              onClick={() => handleToggle(c.id)}
                              className={`text-[11px] h-7 px-3 font-semibold ${
                                isChecked
                                  ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                                  : "bg-cyan-500 text-black hover:bg-cyan-400"
                              }`}
                            >
                              {isChecked ? "Remove" : "+ Target"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/40 pt-4 gap-3">
          <Button variant="outline" onClick={onClose} size="sm" className="text-xs h-9">
            Cancel
          </Button>
          <Button onClick={onClose} size="sm" className="gap-2 font-bold text-xs h-9 bg-cyan-500 hover:bg-cyan-400 text-black px-5">
            <CheckCircle2 className="h-4 w-4" /> Confirm Selection ({selectedCount} Contacts)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
