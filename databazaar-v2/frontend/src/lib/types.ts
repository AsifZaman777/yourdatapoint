// ─── Types & Interfaces for MarketingOstad ───

// ── Auth ──
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin" | "superadmin";
  credits: number;
  warning_message?: string;
  is_banned?: number;
  ip_address?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── Datasets ──
export interface Dataset {
  id: number;
  name: string;
  category: string;
  division?: string;
  district?: string;
  area?: string;
  row_count: number;
  price_credits: number;
  created_at?: string;
}

export interface DatasetDetail {
  dataset: Dataset;
  leads: Lead[];
  unlocked: boolean;
  pages_count: number;
  current_page: number;
}

export interface Lead {
  Name?: string;
  name?: string;
  "Business Name"?: string;
  "Company Name"?: string;
  Phone?: string;
  phone?: string;
  Contact?: string;
  Mobile?: string;
  "Contact / Mobile"?: string;
  Address?: string;
  address?: string;
  Location?: string;
  Website?: string;
  website?: string;
  URL?: string;
  Rating?: string;
  rating?: string;
  Reviews?: string;
  [key: string]: string | undefined;
}

// ── Scraper ──
export interface ScraperJob {
  id: number;
  query: string;
  division?: string;
  district?: string;
  area?: string;
  status: "pending" | "running" | "done" | "stopped" | "failed";
  result_count?: number;
  promotion_status?: "pending" | "approved" | "rejected" | null;
  created_at?: string;
}

export interface ScraperJobStatus {
  job: ScraperJob;
  logs: string[];
}

// ── Marketing ──
export interface CampaignProgress {
  campaign_id: number;
  status: "running" | "done" | "failed" | "stopped" | "stopping";
  total: number;
  sent: number;
  failed_count: number;
  logs: CampaignLog[];
}

export interface CampaignLog {
  index: number;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  timestamp: string;
}

export interface Campaign {
  id: number;
  type: string;
  recipient_group: string;
  status: string;
  total: number;
  sent: number;
  failed_count: number;
  created_at: string;
}

export interface DashboardStats {
  total_campaigns: number;
  total_sent: number;
  total_failed: number;
  campaigns: Campaign[];
}

export interface RecipientContact {
  id: number;
  name: string;
  phone: string;
  email: string;
  area: string;
}

// ── Payments ──
export interface PaymentPackage {
  id: string;
  name: string;
  credits: number;
  price_bdt: number;
  price_per_credit_bdt: number;
  popular: boolean;
  badge?: string;
  save_badge?: string;
  description: string;
  features: string[];
}

export interface PaymentConfig {
  bkash_number: string;
  bkash_account_type: string;
  bkash_qr_url: string;
  pathao_number: string;
  pathao_account_type: string;
  pathao_qr_url: string;
  packages: PaymentPackage[];
  custom_package?: {
    name: string;
    price_per_credit_bdt: number;
    min_credits: number;
    max_credits: number;
    step: number;
    description: string;
    features: string[];
  };
}

export interface PaymentRequest {
  id: number;
  user_id: number;
  user_email?: string;
  full_name?: string;
  package_name: string;
  credits_requested: number;
  amount_bdt: number;
  payment_method: string;
  bkash_number: string;
  transaction_id: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string;
}

// ── Admin ──
export interface SecurityViolation {
  id: number;
  user_id?: number;
  user_email?: string;
  violation_type: string;
  ip_address?: string;
  timestamp: string;
}

export interface PromotionRequest {
  id: number;
  job_id: number;
  user_id: number;
  user_email: string;
  name: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface DatasetRequest {
  id: number;
  user_id: number;
  user_email: string;
  full_name: string;
  category_query: string;
  division?: string;
  district?: string;
  area?: string;
  business_name?: string;
  phone: string;
  additional_notes?: string;
  status: "pending" | "fulfilled" | "rejected";
  created_at: string;
}

// ── Regions Config ──
export interface RegionsConfig {
  [division: string]: {
    [district: string]: string[];
  };
}

// ── Log Files ──
export interface LogFile {
  date: string;
  filename: string;
  size: number;
}

export interface LogFileContent {
  date: string;
  content: string;
  lines: string[];
}
