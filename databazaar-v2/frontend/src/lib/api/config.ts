import apiClient from "./client";
import type { RegionsConfig } from "@/lib/types";

export const configApi = {
  regions: () =>
    apiClient.get<{
      regions: RegionsConfig;
      categories: string[];
      contacts?: Record<string, string>;
    }>("/api/config/regions"),
};
