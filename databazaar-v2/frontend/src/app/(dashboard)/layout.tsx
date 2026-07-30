"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { PaymentWizardModal } from "@/components/payment/payment-wizard-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAdmin } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth");
    }
  }, [isLoading, user, router]);

  // Protect admin routes
  useEffect(() => {
    if (!isLoading && user && pathname.startsWith("/admin") && !isAdmin) {
      router.push("/catalog");
    }
  }, [isLoading, user, pathname, isAdmin, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-mono text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-primary animate-ping" />
          <span>Authenticating session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar onOpenPaymentModal={() => setPaymentModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6">
        {/* Admin Warning Banner for Logged-In User */}
        {user.warning_message && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-start gap-3 shadow-lg">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm">⚠️ Notice from System Administrator</div>
              <div className="text-xs text-foreground/90">{user.warning_message}</div>
            </div>
          </div>
        )}

        {children}
      </main>

      {/* Payment Wizard Modal */}
      <PaymentWizardModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      />
    </div>
  );
}
