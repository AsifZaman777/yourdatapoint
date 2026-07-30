import apiClient from "./client";
import type { DatasetRequest } from "@/lib/types";

export const requestsApi = {
  myRequests: () =>
    apiClient.get<DatasetRequest[]>("/api/requests/my-requests"),

  submit: (data: {
    category_query: string;
    division?: string;
    district?: string;
    area?: string;
    business_name?: string;
    phone: string;
    additional_notes?: string;
  }) => apiClient.post<{ message: string }>("/api/requests/submit", data),
};
