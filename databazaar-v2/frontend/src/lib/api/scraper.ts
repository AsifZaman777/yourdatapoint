import apiClient from "./client";
import { getApiBase, TOKEN_KEY } from "@/lib/constants";
import type { ScraperJob, ScraperJobStatus } from "@/lib/types";

export interface ScrapedDataItem {
  Name?: string;
  Phone?: string;
  Address?: string;
  Website?: string;
  Rating?: string;
  Category?: string;
  "Maps URL"?: string;
  Query?: string;
}

export interface ScrapedDataResponse {
  job_id: number;
  query: string;
  division?: string;
  district?: string;
  area?: string;
  count: number;
  data: ScrapedDataItem[];
}

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

  stopJob: (jobId: number) =>
    apiClient.post<{ message: string }>(`/api/scraper/jobs/${jobId}/stop`),

  jobData: (jobId: number) =>
    apiClient.get<ScrapedDataResponse>(`/api/scraper/jobs/${jobId}/data`),

  downloadJobUrl: (jobId: number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : "";
    return `${getApiBase()}/api/scraper/jobs/${jobId}/download?token=${encodeURIComponent(token || "")}`;
  },

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
