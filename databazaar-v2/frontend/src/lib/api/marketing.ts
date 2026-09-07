import apiClient from "./client";
import type { BrevoApplication, Campaign, CampaignProgress, DashboardStats, LogFile, LogFileContent, RecipientContact } from "@/lib/types";

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

  activeCampaigns: () =>
    apiClient.get<{ active_campaigns: Campaign[] }>("/api/marketing/active-campaigns"),

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

  deleteCampaign: (campaignId: number | string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/marketing/campaign/${campaignId}`),

  clearCampaignLogs: (campaignId: number | string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/marketing/campaign/${campaignId}/logs`),

  clearAllLogs: () =>
    apiClient.delete<{ success: boolean; message: string }>("/api/marketing/logs/clear-all"),

  deleteLogFile: (date: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/marketing/logs/${date}`),

  // ── Brevo Verification & Config ──
  brevoApply: (data: {
    business_name: string;
    domain_name: string;
    location: string;
    business_phone: string;
    social_media_website: string;
  }) => apiClient.post<{ success: boolean; message: string }>("/api/marketing/brevo-apply", data),

  brevoStatus: () =>
    apiClient.get<{
      status: "none" | "pending" | "pending_email_verification" | "email_verified" | "approved" | "rejected";
      api_key?: string;
      daily_limit: number;
      today_sent: number;
      application?: BrevoApplication;
    }>("/api/marketing/brevo-status"),

  checkBrevoVerification: () =>
    apiClient.post<{ success: boolean; status: string; message: string }>("/api/marketing/brevo-check-verification"),

  activateBrevoLink: (activation_url: string) =>
    apiClient.post<{ success: boolean; status: string; message: string }>("/api/marketing/brevo-activate-link", { activation_url }),

  resendBrevoVerification: () =>
    apiClient.post<{ success: boolean; message: string }>("/api/marketing/brevo-resend-verification"),

  listBrevoApplications: () =>
    apiClient.get<BrevoApplication[]>("/api/admin/brevo-applications"),

  approveBrevoApplication: (appId: number, data: { api_key: string; daily_limit?: number; account_status?: string }) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/admin/brevo-applications/${appId}/approve`, data),

  rejectBrevoApplication: (appId: number, data: { reason: string }) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/admin/brevo-applications/${appId}/reject`, data),

  updateUserBrevoConfig: (userId: number, data: { api_key: string; daily_limit?: number; account_status?: string }) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/admin/users/${userId}/brevo-config`, data),

  unapproveUserBrevo: (userId: number) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/admin/users/${userId}/brevo-unapprove`),
};
