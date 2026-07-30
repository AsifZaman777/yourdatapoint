"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Inbox, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScraperForm } from "@/components/scraper/scraper-form";
import { ScraperTerminal } from "@/components/scraper/scraper-terminal";
import { DatasetRequestForm } from "@/components/scraper/dataset-request-form";
import { configApi } from "@/lib/api/config";
import { scraperApi } from "@/lib/api/scraper";
import { requestsApi } from "@/lib/api/requests";
import { useAuth } from "@/providers/auth-provider";
import type { RegionsConfig, DatasetRequest, ScraperJob } from "@/lib/types";

export default function ScraperPage() {
  const { isAdmin } = useAuth();
  const [regionsConfig, setRegionsConfig] = useState<RegionsConfig | null>(null);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [liveImage, setLiveImage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [myRequests, setMyRequests] = useState<DatasetRequest[]>([]);
  const [recentJobs, setRecentJobs] = useState<ScraperJob[]>([]);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Config & Requests
  useEffect(() => {
    configApi
      .regions()
      .then((res) => setRegionsConfig(res.data.regions))
      .catch(() => { });

    requestsApi
      .myRequests()
      .then((res) => setMyRequests(res.data))
      .catch(() => { });

    scraperApi
      .listJobs()
      .then((res) => setRecentJobs(res.data))
      .catch(() => { });
  }, []);

  const loadRequests = useCallback(() => {
    requestsApi
      .myRequests()
      .then((res) => setMyRequests(res.data))
      .catch(() => { });
  }, []);

  // Poll Scraper Job Logs
  const startPollingJob = useCallback((jobId: number) => {
    setActiveJobId(jobId);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await scraperApi.jobStatus(jobId);
        setActiveLogs(res.data.logs);

        // Fetch live screenshot if available
        try {
          const imgRes = await scraperApi.jobScreenshot(jobId);
          if (imgRes.data.available && imgRes.data.image) {
            setLiveImage(imgRes.data.image);
          }
        } catch { }

        if (res.data.job.status === "done" || res.data.job.status === "failed") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          scraperApi.listJobs().then((r) => setRecentJobs(r.data)).catch(() => { });
        }
      } catch {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      }
    }, 2000);
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleJobCreated = (jobId: number) => {
    setCooldown(120);
    startPollingJob(jobId);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">
          {isAdmin ? "Live Google Maps Scraper Console" : "Dataset Request Portal"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isAdmin
            ? "Execute real-time headless web scraping across Google Maps for Bangladesh business leads"
            : "Submit custom dataset requests to our automated scraping engine and track fulfillment"}
        </p>
      </div>

      <Tabs defaultValue={isAdmin ? "scraper" : "request"} className="w-full">
        <TabsList className="bg-card/60 border border-border/40 p-1">
          {isAdmin && (
            <TabsTrigger value="scraper" className="gap-2 text-xs font-semibold">
              <Search className="h-4 w-4 text-cyan-400" />
              Live Scraper Console
            </TabsTrigger>
          )}
          <TabsTrigger value="request" className="gap-2 text-xs font-semibold">
            <Inbox className="h-4 w-4 text-amber-500" />
            Submit Custom Dataset Request
          </TabsTrigger>
        </TabsList>

        {/* TAB: SCRAPER CONSOLE (ADMIN) */}
        {isAdmin && (
          <TabsContent value="scraper" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-6">
                <ScraperForm
                  regionsConfig={regionsConfig}
                  onJobCreated={handleJobCreated}
                  cooldownRemaining={cooldown}
                />
              </div>

              <div className="lg:col-span-6">
                <ScraperTerminal
                  logs={activeLogs}
                  liveImage={liveImage}
                  activeJobId={activeJobId}
                />
              </div>
            </div>
          </TabsContent>
        )}

        {/* TAB: DATASET REQUEST PORTAL */}
        <TabsContent value="request" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6">
              <DatasetRequestForm
                regionsConfig={regionsConfig}
                onRequestSubmitted={loadRequests}
              />
            </div>

            {/* Requests History List */}
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Your Submitted Dataset Requests</h3>
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <Card key={req.id} className="p-4 glass-panel space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-foreground">{req.category_query}</div>
                        <div className="text-xs text-muted-foreground">
                          Location: {[req.division, req.district, req.area].filter(Boolean).join(", ") || "Bangladesh"}
                        </div>
                      </div>

                      {req.status === "pending" && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-500 gap-1 text-[10px]">
                          <Clock className="h-3 w-3" /> Pending Scrape
                        </Badge>
                      )}
                      {req.status === "fulfilled" && (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Fulfilled in Catalog
                        </Badge>
                      )}
                      {req.status === "rejected" && (
                        <Badge variant="outline" className="border-destructive/40 text-destructive gap-1 text-[10px]">
                          <XCircle className="h-3 w-3" /> Unable to Fulfill
                        </Badge>
                      )}
                    </div>

                    {req.additional_notes && (
                      <div className="text-xs text-muted-foreground italic pt-1 border-t border-border/40">
                        Notes: "{req.additional_notes}"
                      </div>
                    )}
                  </Card>
                ))}

                {myRequests.length === 0 && (
                  <div className="text-center py-12 text-xs text-muted-foreground glass-panel">
                    No custom dataset requests submitted yet. Use the form on the left to request custom lead scraping.
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
