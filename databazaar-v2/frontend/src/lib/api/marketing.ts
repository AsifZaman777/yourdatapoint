import apiClient from "./client";
import type { Campaign, CampaignProgress, DashboardStats, LogFile, LogFileContent, RecipientContact } from "@/lib/types";

export const marketingApi = {
  whatsappStatus: () =>
    apiClient.get<{ session_active: boolean }>("/api/marketing/whatsapp-status"),

  whatsappSetupSession: () =>
    apiClient.get<{ message: string }>("/api/marketing/whatsapp-setup-session"),

  whatsappResetSession: () =>
    apiClient.post<{ message: string }>("/api/marketing/whatsapp-reset-session"),

  whatsappProgress: (recipientGroup: string) =>
    apiClient.get<{ last_index: number }>(
      `/api/marketing/whatsapp-progress?recipient_group=${recipientGroup}`
    ),

  sendWhatsapp: (data: {
    recipient_group: string;
    message_template: string;
    resume?: boolean;
    start_row?: number | null;
    selected_contacts?: { phone: string; name: string }[] | null;
  }) => apiClient.post<{ campaign_id: number }>("/api/marketing/send-whatsapp", data),

  campaignStatus: (campaignId: number | string) =>
    apiClient.get<CampaignProgress>(`/api/marketing/whatsapp-campaign/${campaignId}`),

  stopCampaign: (campaignId: number | string) =>
    apiClient.post(`/api/marketing/whatsapp-campaign/${campaignId}/stop`),

  sendEmail: (data: {
    recipient_group: string;
    subject: string;
    html_code: string;
    selected_contacts?: { email: string; name: string }[] | null;
  }) => apiClient.post<{ message: string; campaign_id?: number | string }>("/api/marketing/send-email", data),

  listCampaigns: () =>
    apiClient.get<Campaign[]>("/api/marketing/campaigns"),

  dashboardStats: () =>
    apiClient.get<DashboardStats>("/api/marketing/dashboard-stats"),

  logFiles: () =>
    apiClient.get<LogFile[]>("/api/marketing/logs"),

  logFileContent: (date: string) =>
    apiClient.get<LogFileContent>(`/api/marketing/logs/${date}`),

  recipientContacts: (recipientGroup: string) =>
    apiClient.get<{ contacts: RecipientContact[] }>(
      `/api/marketing/recipient-contacts?recipient_group=${recipientGroup}`
    ),
};
