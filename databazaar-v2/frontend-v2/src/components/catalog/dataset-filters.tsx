"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/providers/language-provider";
import type { RegionsConfig } from "@/lib/types";

interface DatasetFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  division: string;
  onDivisionChange: (val: string) => void;
  district: string;
  onDistrictChange: (val: string) => void;
  area: string;
  onAreaChange: (val: string) => void;
  categoriesList: string[];
  regionsConfig: RegionsConfig | null;
}

export function DatasetFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  division,
  onDivisionChange,
  district,
  onDistrictChange,
  area,
  onAreaChange,
  categoriesList,
  regionsConfig,
}: DatasetFiltersProps) {
  const { t } = useLanguage();
  const ct = t.catalog || {};

  const divisions = regionsConfig ? Object.keys(regionsConfig) : [];
  const districts =
    regionsConfig && division && regionsConfig[division]
      ? Object.keys(regionsConfig[division])
      : [];
  const areas =
    regionsConfig && division && district && regionsConfig[division]?.[district]
      ? regionsConfig[division][district]
      : [];

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={ct.searchPlaceholder || "Search public datasets..."}
          className="pl-9 h-10 text-xs"
        />
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Category Select */}
      <Select value={category || "ALL"} onValueChange={(val) => onCategoryChange(!val || val === "ALL" ? "" : val)}>
        <SelectTrigger className="w-[160px] h-10 text-xs">
          <SelectValue placeholder={ct.allCategories || "All Categories"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{ct.allCategories || "All Categories"}</SelectItem>
          {categoriesList.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Division Select */}
      <Select
        value={division || "ALL"}
        onValueChange={(val) => {
          const v = !val || val === "ALL" ? "" : val;
          onDivisionChange(v);
          onDistrictChange("");
          onAreaChange("");
        }}
      >
        <SelectTrigger className="w-[160px] h-10 text-xs">
          <SelectValue placeholder={ct.allDivisions || "All Divisions"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{ct.allDivisions || "All Divisions"}</SelectItem>
          {divisions.map((div) => (
            <SelectItem key={div} value={div}>
              {div}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* District Select */}
      <Select
        value={district || "ALL"}
        disabled={!division}
        onValueChange={(val) => {
          const v = !val || val === "ALL" ? "" : val;
          onDistrictChange(v);
          onAreaChange("");
        }}
      >
        <SelectTrigger className="w-[160px] h-10 text-xs">
          <SelectValue placeholder={ct.allDistricts || "All Districts"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{ct.allDistricts || "All Districts"}</SelectItem>
          {districts.map((dist) => (
            <SelectItem key={dist} value={dist}>
              {dist}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Area Select */}
      <Select
        value={area || "ALL"}
        disabled={!district}
        onValueChange={(val) => onAreaChange(!val || val === "ALL" ? "" : val)}
      >
        <SelectTrigger className="w-[160px] h-10 text-xs">
          <SelectValue placeholder={ct.allAreas || "All Areas"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{ct.allAreas || "All Areas"}</SelectItem>
          {areas.map((ar) => (
            <SelectItem key={ar} value={ar}>
              {ar}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
