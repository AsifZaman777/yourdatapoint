"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DatasetCard } from "@/components/catalog/dataset-card";
import { PrivateDatasetCard } from "@/components/catalog/private-dataset-card";
import { DatasetFilters } from "@/components/catalog/dataset-filters";
import { DatasetDetailView } from "@/components/catalog/dataset-detail-view";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { PromptModal } from "@/components/ui/modal-prompt";
import { datasetsApi } from "@/lib/api/datasets";
import { scraperApi } from "@/lib/api/scraper";
import { configApi } from "@/lib/api/config";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";
import type { Dataset, DatasetDetail, ScraperJob, RegionsConfig } from "@/lib/types";

export default function CatalogPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const { token, user, refreshProfile, isAdmin } = useAuth();
  const { t } = useLanguage();
  const ct = t.catalog || {};
  const [catalogTab, setCatalogTab] = useState<"public" | "private">(tabParam === "private" ? "private" : "public");

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

  // Private jobs list & demoted private datasets state
  const [scraperJobs, setScraperJobs] = useState<ScraperJob[]>([]);
  const [myPrivateDatasets, setMyPrivateDatasets] = useState<Dataset[]>([]);

  // Selected Detail View State
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [detail, setDetail] = useState<DatasetDetail | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; query: string } | null>(null);
  const [deletePublicTarget, setDeletePublicTarget] = useState<Dataset | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<Dataset | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<{ id: number; query: string } | null>(null);
  const [isDemoting, setIsDemoting] = useState(false);

  // Load configs
  useEffect(() => {
    configApi
      .regions()
      .then((res) => {
        setRegionsConfig(res.data.regions);
        setCategoriesList(res.data.categories);
      })
      .catch(() => {});
  }, []);

  // Load Public Datasets
  const loadPublicDatasets = useCallback(() => {
    datasetsApi
      .list({ category, division, district, area, search })
      .then((res) => setDatasets(res.data))
      .catch(() => {});
  }, [category, division, district, area, search]);

  useEffect(() => {
    loadPublicDatasets();
  }, [loadPublicDatasets]);

  // Load Private Datasets & Done Scraper Jobs
  const loadPrivateDatasets = useCallback(() => {
    scraperApi
      .listJobs()
      .then((res) => setScraperJobs(res.data))
      .catch(() => {});

    datasetsApi
      .myPrivate()
      .then((res) => setMyPrivateDatasets(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPrivateDatasets();
  }, [loadPrivateDatasets]);

  // Handle Demoting Public Dataset to Private
  const confirmDemoteDataset = async () => {
    if (!demoteTarget) return;
    setIsDemoting(true);
    try {
      await datasetsApi.demote(demoteTarget.id);
      toast.success(`Dataset "${demoteTarget.name}" demoted to Private Catalogue!`);
      setDemoteTarget(null);
      loadPublicDatasets();
      loadPrivateDatasets();
      setCatalogTab("private");
    } catch {
      toast.error("Failed to demote dataset.");
    } finally {
      setIsDemoting(false);
    }
  };

  // Open dataset details
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);

  const handleOpenDetails = async (
    id: string | number,
    page = 1,
    limit = pageSize,
    searchQuery = activeSearchQuery
  ) => {
    setSelectedId(id);
    setActiveSearchQuery(searchQuery);
    try {
      const res = await datasetsApi.detail(id, page, limit, searchQuery);
      setDetail(res.data);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Failed to load dataset details."));
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
      toast.error(getApiErrorMessage(err, "Failed to unlock dataset."));
    }
  };

  const confirmDeletePublic = async () => {
    if (!deletePublicTarget) return;
    try {
      await datasetsApi.delete(deletePublicTarget.id);
      toast.success("Public dataset deleted successfully!");
      loadPublicDatasets();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Failed to delete public dataset."));
    } finally {
      setDeletePublicTarget(null);
    }
  };

  // Delete private job
  const confirmDeleteJob = async () => {
    if (!deleteTarget) return;
    try {
      await scraperApi.deleteJob(deleteTarget.id);
      toast.success("Private dataset deleted.");
      loadPrivateJobs();
    } catch {
      toast.error("Failed to delete dataset.");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Request catalog promotion
  const confirmPromoteJob = async (proposedName: string) => {
    if (!promoteTarget || !proposedName) return;
    try {
      const res = await scraperApi.requestPromote(promoteTarget.id, proposedName, "General Business");
      toast.success(res.data.message || "Promotion requested!");
      loadPrivateJobs();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Promotion failed."));
    } finally {
      setPromoteTarget(null);
    }
  };

  // If detail view is active, render Detail View
  if (selectedId && detail) {
    return (
      <DatasetDetailView
        detail={detail}
        token={token}
        user={user}
        pageSize={pageSize}
        onBack={() => {
          setSelectedId(null);
          setDetail(null);
          setActiveSearchQuery("");
        }}
        onUnlock={handleUnlock}
        onPageChange={(page) => handleOpenDetails(selectedId, page, pageSize, activeSearchQuery)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          handleOpenDetails(selectedId, 1, newSize, activeSearchQuery);
        }}
        onSearch={(sq) => handleOpenDetails(selectedId, 1, pageSize, sq)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{ct.title || "Datasets Catalog"}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {ct.subtitle || "Browse verified public business leads and your private scraped datasets across Bangladesh"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={catalogTab} onValueChange={(v) => setCatalogTab(v as any)} className="w-full">
        <TabsList className="bg-card/60 border border-border/40 p-1">
          <TabsTrigger value="public" className="gap-2 text-xs font-semibold">
            <Globe className="h-4 w-4 text-cyan-400" />
            {ct.tabPublic || "Public Catalog"} ({datasets.length})
          </TabsTrigger>
          <TabsTrigger value="private" className="gap-2 text-xs font-semibold">
            <Lock className="h-4 w-4 text-amber-500" />
            {ct.tabPrivate || "My Private Leads"} ({scraperJobs.filter((j) => j.status === "done").length})
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
              <DatasetCard
                key={ds.id}
                dataset={ds}
                isAdmin={isAdmin}
                onView={(id) => handleOpenDetails(id)}
                onDelete={(target) => setDeletePublicTarget(target)}
                onDemote={(target) => setDemoteTarget(target)}
              />
            ))}

            {datasets.length === 0 && (
              <div className="col-span-full text-center py-16 text-xs text-muted-foreground glass-panel">
                {ct.noPublicMatch || "No public datasets match your active search filters."}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: PRIVATE LEADS & DEMOTED DATASETS */}
        <TabsContent value="private" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Scraped Jobs */}
            {scraperJobs
              .filter((j) => j.status === "done" || j.status === "stopped")
              .map((job) => (
                <PrivateDatasetCard
                  key={`job_${job.id}`}
                  job={job}
                  onView={(id) => handleOpenDetails(`job_${id}`)}
                  onUseLeads={() => router.push(`/marketing?tab=whatsapp&group=job_${job.id}`)}
                  onDelete={(id, q) => setDeleteTarget({ id, query: q })}
                  onPromote={(id, q) => setPromoteTarget({ id, query: q })}
                  isAdmin={isAdmin}
                />
              ))}

            {/* 2. Demoted Datasets */}
            {myPrivateDatasets.map((ds) => (
              <DatasetCard
                key={`ds_${ds.id}`}
                dataset={ds}
                isAdmin={isAdmin}
                onView={(id) => handleOpenDetails(id)}
                onDelete={(target) => setDeletePublicTarget(target)}
              />
            ))}

            {scraperJobs.filter((j) => j.status === "done" || j.status === "stopped").length === 0 &&
              myPrivateDatasets.length === 0 && (
                <div className="col-span-full text-center py-16 text-xs text-muted-foreground glass-panel">
                  {ct.noPrivateMatch || "No private datasets found. Launch a scraping job from the Scraper Console or demote a public dataset to store it in your private leads."}
                </div>
              )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Demote Public Dataset to Private Confirmation Modal */}
      <ConfirmModal
        open={!!demoteTarget}
        onClose={() => setDemoteTarget(null)}
        onConfirm={confirmDemoteDataset}
        title={`Demote "${demoteTarget?.name}" to Private?`}
        description={`Demoting this dataset will unpublish it from the Public Catalog and store it inside your Private Catalogue.`}
        confirmText={isDemoting ? "Demoting..." : "Demote to Private"}
      />

      {/* Public Dataset Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deletePublicTarget}
        onClose={() => setDeletePublicTarget(null)}
        onConfirm={confirmDeletePublic}
        title="Delete Public Dataset"
        description={`Are you sure you want to delete the public dataset "${deletePublicTarget?.name}"? This action will permanently remove it from the public catalog.`}
        confirmText="Delete Dataset"
        isDanger
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteJob}
        title="Delete Private Dataset"
        description={`Are you sure you want to delete "${deleteTarget?.query}"? This action cannot be undone.`}
        confirmText="Delete Dataset"
        isDanger
      />

      {/* Promote Prompt Modal */}
      <PromptModal
        open={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        onConfirm={confirmPromoteJob}
        title="Request Catalog Promotion"
        description="Enter the proposed dataset title for approval to publish to the public catalog:"
        defaultValue={promoteTarget?.query || ""}
        placeholder="Enter proposed title..."
        confirmText="Submit Request"
      />
    </div>
  );
}
