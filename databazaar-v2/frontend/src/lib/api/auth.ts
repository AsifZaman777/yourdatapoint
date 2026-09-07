import apiClient from "./client";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "@/lib/types";

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>("/api/auth/login", data),

  register: (data: RegisterPayload) =>
    apiClient.post<{ message: string }>("/api/auth/register", data),

  me: () =>
    apiClient.get<User>("/api/auth/me"),

  verifyEmail: (token: string) =>
    apiClient.get<{ success: boolean; message: string; already_verified?: boolean }>(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`
    ),

  resendVerification: (email: string) =>
    apiClient.post<{ message: string }>("/api/auth/resend-verification", { email }),
};
