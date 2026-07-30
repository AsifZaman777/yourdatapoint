import apiClient from "./client";
import type { ScraperJob, ScraperJobStatus } from "@/lib/types";

export const scraperApi = {
  startScrape: (data: {
    queries: string[];
    query: string;
    division?: string;
    district?: string;
    area?: string;
    headless?: boolean;
  }) => apiClient.post<{ job_id: number }>("/api/scraper/scrape", data),

  listJobs: () =>
    apiClient.get<ScraperJob[]>("/api/scraper/jobs"),

  jobStatus: (jobId: number) =>
    apiClient.get<ScraperJobStatus>(`/api/scraper/jobs/${jobId}/status`),

  jobScreenshot: (jobId: number) =>
    apiClient.get<{ available: boolean; image?: string }>(
      `/api/scraper/jobs/${jobId}/screenshot`
    ),

  deleteJob: (jobId: number) =>
    apiClient.delete<{ message: string }>(`/api/scraper/jobs/${jobId}`),

  requestPromote: (jobId: number, name: string, category: string) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    return apiClient.post<{ message: string }>(
      `/api/scraper/jobs/${jobId}/request-promote`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },
};
