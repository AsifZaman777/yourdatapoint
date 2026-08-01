"use client";

import { Eye, Coins, MapPin, Database, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/providers/language-provider";
import type { Dataset } from "@/lib/types";

interface DatasetCardProps {
  dataset: Dataset;
  isAdmin?: boolean;
  onView: (id: number) => void;
  onDelete?: (dataset: Dataset) => void;
}

export function DatasetCard({ dataset, isAdmin, onView, onDelete }: DatasetCardProps) {
  const { t } = useLanguage();
  const ct = t.catalog || {};

  const locationText =
    dataset.area || dataset.district || dataset.division || "Bangladesh";

  return (
    <Card className="glass-panel border-border/40 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between group">
      <CardContent className="p-5 space-y-3">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {dataset.category}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">#{dataset.id}</span>
            {isAdmin && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(dataset);
                }}
                className="h-6 w-6 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                title="Delete public dataset"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {dataset.name}
        </h3>

        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{ct.covering || "Covering"}: {locationText}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>{ct.leadsParsed || "Leads parsed"}: {dataset.row_count}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3 border-t border-border/40 flex justify-between items-center bg-card/40">
        <div className="flex items-center gap-1 font-mono text-amber-500 font-bold text-sm">
          <Coins className="h-4 w-4" />
          <span>{dataset.price_credits} CR</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(dataset)}
              className="gap-1 text-xs h-8 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(dataset.id)}
            className="gap-1.5 text-xs h-8"
          >
            <Eye className="h-3.5 w-3.5" />
            {ct.btnView || "View Dataset"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
