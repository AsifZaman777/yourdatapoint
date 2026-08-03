"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Upload, Inbox, Coins, LayoutDashboard } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { DatasetUploadForm } from "@/components/admin/dataset-upload-form";
import { PromotionRequests } from "@/components/admin/promotion-requests";
import { PaymentVerification } from "@/components/admin/payment-verification";
import { GatewaySettings } from "@/components/admin/gateway-settings";
import { adminApi } from "@/lib/api/admin";
import { configApi } from "@/lib/api/config";
import { useLanguage } from "@/providers/language-provider";
import type {
  RegionsConfig,
  PromotionRequest,
  PaymentRequest,
  DatasetRequest,
} from "@/lib/types";

interface AdminPageProps {
  initialTab?: string;
}

export default function AdminPage({ initialTab = "dashboard" }: AdminPageProps) {
  const { t } = useLanguage();
  const at = t.admin || {};
  const [activeTab, setActiveTab] = useState(initialTab);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [regionsConfig, setRegionsConfig] = useState<RegionsConfig | null>(null);

  const [promotions, setPromotions] = useState<PromotionRequest[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [datasetRequests, setDatasetRequests] = useState<DatasetRequest[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    configApi.regions().then((r) => {
      setCategoriesList(r.data.categories);
      setRegionsConfig(r.data.regions);
    }).catch(() => {});
  }, []);

  const loadData = useCallback(() => {
    adminApi.listPromotionRequests().then((r) => setPromotions(r.data)).catch(() => {});
    adminApi.listPaymentRequests().then((r) => setPayments(r.data)).catch(() => {});
    adminApi.listDatasetRequests().then((r) => setDatasetRequests(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pendingPayments = payments.filter((p) => p.status === "pending").length;
  const pendingRequests = datasetRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{at.title || "Admin Overview & Control Center"}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {at.subtitle || "Manage dataset uploads, promotion approvals, customer payments, and gateway configurations"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/60 border border-border/40 p-1 flex-wrap h-auto">
          <TabsTrigger value="dashboard" className="gap-2 text-xs font-semibold">
            <LayoutDashboard className="h-4 w-4 text-primary" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2 text-xs font-semibold">
            <Upload className="h-4 w-4 text-cyan-400" /> {at.tabUpload || "Upload Dataset"}
          </TabsTrigger>
          <TabsTrigger value="promotions" className="gap-2 text-xs font-semibold">
            <Settings className="h-4 w-4 text-purple-400" /> {at.tabPromotions || "Catalog Promotions"} ({promotions.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 text-xs font-semibold">
            <Coins className="h-4 w-4 text-amber-500" /> {at.tabPayments || "Payment Verification"} ({pendingPayments})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2 text-xs font-semibold">
            <Inbox className="h-4 w-4 text-emerald-400" /> {at.tabRequests || "Dataset Requests"} ({pendingRequests})
          </TabsTrigger>
          <TabsTrigger value="gateway" className="gap-2 text-xs font-semibold">
            <Settings className="h-4 w-4 text-muted-foreground" /> {at.tabGateway || "Gateway Settings"}
          </TabsTrigger>
        </TabsList>

        {/* TAB 0: DASHBOARD */}
        <TabsContent value="dashboard" className="pt-4">
          <AdminDashboard />
        </TabsContent>

        {/* TAB 1: UPLOAD */}
        <TabsContent value="upload" className="pt-4">
          <DatasetUploadForm
            categoriesList={categoriesList}
            regionsConfig={regionsConfig}
            onSuccess={loadData}
          />
        </TabsContent>

        {/* TAB 2: PROMOTIONS */}
        <TabsContent value="promotions" className="pt-4">
          <PromotionRequests requests={promotions} onRefresh={loadData} />
        </TabsContent>

        {/* TAB 3: PAYMENTS */}
        <TabsContent value="payments" className="pt-4">
          <PaymentVerification requests={payments} onRefresh={loadData} />
        </TabsContent>

        {/* TAB 4: REQUESTS */}
        <TabsContent value="requests" className="pt-4 space-y-4">
          <div className="rounded-lg border border-border/40 overflow-hidden bg-card/60 p-4">
            <h3 className="text-sm font-bold mb-3">{at.tabRequests || "Custom Dataset Requests List"}</h3>
            <div className="space-y-3">
              {datasetRequests.map((req) => (
                <div key={req.id} className="p-3 rounded-lg border border-border/30 bg-background/50 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-foreground">{req.category_query}</div>
                    <div className="text-muted-foreground">User: {req.user_email} | Phone: {req.phone}</div>
                  </div>
                  <span className="font-mono uppercase text-amber-500 font-bold">{req.status}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: GATEWAY */}
        <TabsContent value="gateway" className="pt-4">
          <GatewaySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
