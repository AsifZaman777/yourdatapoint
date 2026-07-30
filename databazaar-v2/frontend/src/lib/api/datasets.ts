import apiClient from "./client";
import type { Dataset, DatasetDetail } from "@/lib/types";

export interface DatasetFilters {
  category?: string;
  division?: string;
  district?: string;
  area?: string;
  search?: string;
}

export const datasetsApi = {
  list: (filters: DatasetFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append("category", filters.category);
    if (filters.division) params.append("division", filters.division);
    if (filters.district) params.append("district", filters.district);
    if (filters.area) params.append("area", filters.area);
    if (filters.search) params.append("search", filters.search);
    return apiClient.get<Dataset[]>(`/api/datasets?${params.toString()}`);
  },

  detail: (id: string | number, page = 1, search = "") =>
    apiClient.get<DatasetDetail>(
      `/api/datasets/${id}?page=${page}&search=${encodeURIComponent(search)}`
    ),

  unlock: (id: number) =>
    apiClient.post<{ message: string }>(`/api/datasets/${id}/unlock`),

  exportUrl: (id: number, format: string, token: string) =>
    `${apiClient.defaults.baseURL}/api/datasets/${id}/export?format=${format}&token=${token}`,
};
