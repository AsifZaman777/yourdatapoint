"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopNavbar } from "@/components/layout/top-navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { authApi } from "@/lib/api/auth";
import { toast } from "sonner";

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"login" | "register">("login");
  const [verificationNotice, setVerificationNotice] = useState("");

  // Handle URL verification token auto-verify
  useEffect(() => {
    const verifyToken = searchParams.get("verify_token");
    if (verifyToken) {
      authApi
        .verifyEmail(verifyToken)
        .then((res) => {
          if (res.data.success) {
            toast.success(res.data.message || "Email verified! You can now log in.");
            setVerificationNotice(res.data.message);
          } else {
            toast.warning(res.data.message || "Invalid or expired verification link.");
          }
        })
        .catch(() => {
          toast.error("Failed to connect to verification server.");
        })
        .finally(() => {
          setView("login");
          router.replace("/auth");
        });
    }
  }, [searchParams, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-16">
      <Card className="glass-panel w-full max-w-md p-6 sm:p-8">
        <CardContent className="p-0">
          {view === "login" ? (
            <LoginForm
              onToggleView={() => setView("register")}
              verificationNotice={verificationNotice}
            />
          ) : (
            <RegisterForm
              onSuccess={(notice) => {
                setVerificationNotice(notice);
                setView("login");
              }}
              onToggleView={() => setView("login")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNavbar />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <AuthContent />
      </Suspense>
      <Footer />
    </div>
  );
}
