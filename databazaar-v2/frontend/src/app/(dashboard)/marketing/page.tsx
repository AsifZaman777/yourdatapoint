"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Mail, BarChart3, History, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardStats } from "@/components/marketing/dashboard-stats";
import { WhatsAppPanel } from "@/components/marketing/whatsapp-panel";
import { EmailBuilder } from "@/components/marketing/email-builder";
import { CampaignHistory } from "@/components/marketing/campaign-history";
import { LogViewer } from "@/components/marketing/log-viewer";
import { ContactSelectorModal } from "@/components/marketing/contact-selector-modal";
import { marketingApi } from "@/lib/api/marketing";
import { datasetsApi } from "@/lib/api/datasets";
import type { DashboardStats as StatsType, Dataset, RecipientContact } from "@/lib/types";

import { useSearchParams } from "next/navigation";

export default function MarketingPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const groupParam = searchParams.get("group");

  const [activeTab, setActiveTab] = useState(tabParam || "dashboard");
  const [stats, setStats] = useState<StatsType | null>(null);
  const [recipientGroups, setRecipientGroups] = useState<Dataset[]>([]);

  // Contact selector modal state
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activeGroupVal, setActiveGroupVal] = useState(groupParam || "");
  const [groupContacts, setGroupContacts] = useState<RecipientContact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());

  const loadStats = useCallback(() => {
    marketingApi
      .dashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => { });
  }, []);

  const loadRecipientGroups = useCallback(() => {
    datasetsApi
      .list()
      .then((res) => setRecipientGroups(res.data))
      .catch(() => { });
  }, []);

  useEffect(() => {
    loadStats();
    loadRecipientGroups();
    if (groupParam) {
      loadContactsForGroup(groupParam);
    }
  }, [loadStats, loadRecipientGroups, groupParam]);

  // Load Contacts when active group changes
  const loadContactsForGroup = async (groupVal: string) => {
    setActiveGroupVal(groupVal);
    if (!groupVal) {
      setGroupContacts([]);
      setSelectedContactIds(new Set());
      return;
    }
    try {
      const res = await marketingApi.recipientContacts(groupVal);
      if (res.data && res.data.contacts) {
        setGroupContacts(res.data.contacts);
        setSelectedContactIds(new Set(res.data.contacts.map((c) => c.id)));
      }
    } catch {
      setGroupContacts([]);
      setSelectedContactIds(new Set());
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Multi-Channel Marketing Automation</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Power anti-ban WhatsApp campaigns and HTML email template dispatches to your verified leads
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card/60 border border-border/40 p-1 flex-wrap h-auto">
          <TabsTrigger value="dashboard" className="gap-2 text-xs font-semibold">
            <BarChart3 className="h-4 w-4 text-cyan-400" /> Dashboard Overview
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 text-xs font-semibold">
            <Send className="h-4 w-4 text-emerald-400" /> WhatsApp Campaign
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 text-xs font-semibold">
            <Mail className="h-4 w-4 text-purple-400" /> Email Campaign
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
            <History className="h-4 w-4 text-amber-500" /> Campaign History
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs font-semibold">
            <FileText className="h-4 w-4 text-muted-foreground" /> Daily System Logs
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-6 pt-4">
          <DashboardStats stats={stats} />
          <CampaignHistory campaigns={stats?.campaigns || []} onRefresh={loadStats} />
        </TabsContent>

        {/* TAB 2: WHATSAPP */}
        <TabsContent value="whatsapp" className="space-y-6 pt-4">
          <WhatsAppPanel
            recipientGroups={recipientGroups}
            onOpenSelector={() => setSelectorOpen(true)}
            selectedContactsCount={selectedContactIds.size}
            totalContactsCount={groupContacts.length}
            groupContacts={groupContacts}
            selectedContactIds={selectedContactIds}
            onSelectGroup={loadContactsForGroup}
            initialGroup={groupParam || undefined}
          />
        </TabsContent>

        {/* TAB 3: EMAIL */}
        <TabsContent value="email" className="space-y-6 pt-4">
          <EmailBuilder
            recipientGroups={recipientGroups}
            onOpenSelector={() => setSelectorOpen(true)}
            selectedContactsCount={selectedContactIds.size}
            totalContactsCount={groupContacts.length}
            groupContacts={groupContacts}
            selectedContactIds={selectedContactIds}
            onSelectGroup={loadContactsForGroup}
          />
        </TabsContent>

        {/* TAB 4: HISTORY */}
        <TabsContent value="history" className="space-y-6 pt-4">
          <CampaignHistory campaigns={stats?.campaigns || []} onRefresh={loadStats} />
        </TabsContent>

        {/* TAB 5: LOGS */}
        <TabsContent value="logs" className="space-y-6 pt-4">
          <LogViewer />
        </TabsContent>
      </Tabs>

      {/* Contact Selector Modal */}
      <ContactSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        contacts={groupContacts}
        selectedIds={selectedContactIds}
        onSelectionChange={setSelectedContactIds}
      />
    </div>
  );
}
