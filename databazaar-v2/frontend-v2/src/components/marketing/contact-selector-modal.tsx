"use client";

import { useState } from "react";
import { User, Search, CheckCircle2 } from "lucide-react";
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

  const filtered = contacts.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.area.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(contacts.map((c) => c.id)));
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-panel max-w-4xl max-h-[85vh] overflow-y-auto p-6 flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="h-5 w-5 text-cyan-400" />
            Granular Target Lead Selector & Inspector
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Select exact contacts to receive your campaign dispatch
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 flex flex-col">
          {/* Search & Bulk Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts by name, phone, email, area..."
                className="pl-9 text-xs h-9"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSelectAll} className="text-xs h-9">
                ✓ Select All ({contacts.length})
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeselectAll} className="text-xs h-9">
                ✕ Deselect All
              </Button>
            </div>
          </div>

          {/* Status Pill */}
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs flex justify-between items-center font-mono">
            <span>
              Target Selection: <strong className="text-cyan-400">{selectedIds.size}</strong> out of{" "}
              <strong>{contacts.length}</strong> contacts selected
            </span>
            <span className="text-muted-foreground text-[10px]">
              {selectedIds.size === contacts.length ? "Entire List Selected" : "Custom Subset Selected"}
            </span>
          </div>

          {/* Contacts Table */}
          <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50 flex-1 overflow-y-auto max-h-[350px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={contacts.length > 0 && selectedIds.size === contacts.length}
                      onCheckedChange={(c) => (c ? handleSelectAll() : handleDeselectAll())}
                    />
                  </TableHead>
                  <TableHead className="w-16">Row #</TableHead>
                  <TableHead>Contact Name</TableHead>
                  <TableHead>Phone / Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const isChecked = selectedIds.has(c.id);
                  return (
                    <TableRow
                      key={c.id}
                      onClick={() => handleToggle(c.id)}
                      className={`cursor-pointer ${isChecked ? "bg-cyan-500/5" : ""}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                        <Checkbox checked={isChecked} onCheckedChange={() => handleToggle(c.id)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">#{c.id + 1}</TableCell>
                      <TableCell className="font-semibold text-xs">{c.name}</TableCell>
                      <TableCell className="text-xs font-mono text-cyan-400">
                        {c.phone || c.email || "N/A"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.area || "BD"}</TableCell>
                      <TableCell>
                        {isChecked ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                            SELECTED
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            EXCLUDED
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button onClick={onClose} size="sm" className="gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4" /> Confirm ({selectedIds.size} Contacts)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
