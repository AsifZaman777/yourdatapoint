import apiClient from "./client";
import type { PaymentConfig, PaymentRequest } from "@/lib/types";

export const paymentsApi = {
  packagesConfig: () =>
    apiClient.get<PaymentConfig>("/api/payments/packages-config"),

  myRequests: () =>
    apiClient.get<PaymentRequest[]>("/api/payments/my-requests"),

  submitRequest: (data: {
    package_name: string;
    credits_requested: number;
    amount_bdt: number;
    payment_method: string;
    user_name: string;
    bkash_number: string;
    transaction_id: string;
  }) => apiClient.post<{ message: string }>("/api/payments/submit-request", data),
};
