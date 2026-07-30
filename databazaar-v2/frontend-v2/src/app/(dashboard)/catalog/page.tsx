"use client";

import { useEffect, useState, useCallback } from "react";
import { Globe, Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DatasetCard } from "@/components/catalog/dataset-card";
import { PrivateDatasetCard } from "@/components/catalog/private-dataset-card";
import { DatasetFilters } from "@/components/catalog/dataset-filters";
import { DatasetDetailView } from "@/components/catalog/dataset-detail-view";
import { datasetsApi } from "@/lib/api/datasets";
import { scraperApi } from "@/lib/api/scraper";
import { configApi } from "@/lib/api/config";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import type { Dataset, DatasetDetail, ScraperJob, RegionsConfig } from "@/lib/types";

export default function CatalogPage() {
  const { token, user, refreshProfile, isAdmin } = useAuth();
  const [catalogTab, setCatalogTab] = useState<"public" | "private">("public");

  // Public datasets list state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [area, setArea] = useState("");

  // Config list
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [regionsConfig, setRegionsConfig] = useState<RegionsConfig | null>(null);

  // Private jobs list state
  const [scraperJobs, setScraperJobs] = useState<ScraperJob[]>([]);

  // Selected Detail View State
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [detail, setDetail] = useState<DatasetDetail | null>(null);

  // Load configs
  useEffect(() => {
    configApi
      .regions()
      .then((res) => {
        setRegionsConfig(res.data.regions);
        setCategoriesList(res.data.categories);
      })
      .catch(() => { });
  }, []);

  // Load Public Datasets
  const loadPublicDatasets = useCallback(() => {
    datasetsApi
      .list({ category, division, district, area, search })
      .then((res) => setDatasets(res.data))
      .catch(() => { });
  }, [category, division, district, area, search]);

  useEffect(() => {
    loadPublicDatasets();
  }, [loadPublicDatasets]);

  // Load Private Datasets (Done Scraper Jobs)
  const loadPrivateJobs = useCallback(() => {
    scraperApi
      .listJobs()
      .then((res) => setScraperJobs(res.data))
      .catch(() => { });
  }, []);

  useEffect(() => {
    loadPrivateJobs();
  }, [loadPrivateJobs]);

  // Open dataset details
  const handleOpenDetails = async (id: string | number, page = 1, searchQuery = "") => {
    setSelectedId(id);
    try {
      const res = await datasetsApi.detail(id, page, searchQuery);
      setDetail(res.data);
    } catch {
      toast.error("Failed to load dataset details.");
    }
  };

  // Unlock dataset
  const handleUnlock = async () => {
    if (!detail || !token) return;
    try {
      const res = await datasetsApi.unlock(detail.dataset.id);
      toast.success(res.data.message || "Dataset unlocked successfully!");
      refreshProfile();
      handleOpenDetails(detail.dataset.id);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to unlock dataset.");
    }
  };

  // Delete private job
  const handleDeleteJob = async (jobId: number, query: string) => {
    if (!confirm(`Are you sure you want to delete "${query}"?`)) return;
    try {
      await scraperApi.deleteJob(jobId);
      toast.success("Private dataset deleted.");
      loadPrivateJobs();
    } catch {
      toast.error("Failed to delete dataset.");
    }
  };

  // Request catalog promotion
  const handlePromote = async (jobId: number, query: string) => {
    const proposedName = prompt("Enter proposed dataset title:", query);
    if (!proposedName) return;
    try {
      const res = await scraperApi.requestPromote(jobId, proposedName, "General Business");
      toast.success(res.data.message || "Promotion requested!");
      loadPrivateJobs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Promotion failed.");
    }
  };

  // If detail view is active, render Detail View
  if (selectedId && detail) {
    return (
      <DatasetDetailView
        detail={detail}
        token={token}
        user={user}
        onBack={() => {
          setSelectedId(null);
          setDetail(null);
        }}
        onUnlock={handleUnlock}
        onPageChange={(page) => handleOpenDetails(selectedId, page)}
        onSearch={(sq) => handleOpenDetails(selectedId, 1, sq)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Datasets Catalog</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Browse verified public business leads and your private scraped datasets across Bangladesh
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={catalogTab} onValueChange={(v) => setCatalogTab(v as any)} className="w-full">
        <TabsList className="bg-card/60 border border-border/40 p-1">
          <TabsTrigger value="public" className="gap-2 text-xs font-semibold">
            <Globe className="h-4 w-4 text-cyan-400" />
            Public Catalog ({datasets.length})
          </TabsTrigger>
          <TabsTrigger value="private" className="gap-2 text-xs font-semibold">
            <Lock className="h-4 w-4 text-amber-500" />
            My Private Leads ({scraperJobs.filter((j) => j.status === "done").length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PUBLIC CATALOG */}
        <TabsContent value="public" className="space-y-6 pt-4">
          <DatasetFilters
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            division={division}
            onDivisionChange={setDivision}
            district={district}
            onDistrictChange={setDistrict}
            area={area}
            onAreaChange={setArea}
            categoriesList={categoriesList}
            regionsConfig={regionsConfig}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((ds) => (
              <DatasetCard key={ds.id} dataset={ds} onView={(id) => handleOpenDetails(id)} />
            ))}

            {datasets.length === 0 && (
              <div className="col-span-full text-center py-16 text-xs text-muted-foreground glass-panel">
                No public datasets match your active search filters.
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: PRIVATE LEADS */}
        <TabsContent value="private" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scraperJobs
              .filter((j) => j.status === "done")
              .map((job) => (
                <PrivateDatasetCard
                  key={job.id}
                  job={job}
                  onView={(id) => handleOpenDetails(`job_${id}`)}
                  onUseLeads={() => (window.location.href = "/marketing")}
                  onDelete={handleDeleteJob}
                  onPromote={handlePromote}
                  isAdmin={isAdmin}
                />
              ))}

            {scraperJobs.filter((j) => j.status === "done").length === 0 && (
              <div className="col-span-full text-center py-16 text-xs text-muted-foreground glass-panel">
                No private scraped datasets found. Launch a scraping job from the Scraper Console to generate your private leads.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
