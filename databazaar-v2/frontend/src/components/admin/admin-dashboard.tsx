"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  DollarSign,
  Clock,
  Activity,
  Database,
  TrendingUp,
  Download,
  Trash2,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Eye,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { adminApi } from "@/lib/api/admin";
import { getApiBase, TOKEN_KEY } from "@/lib/constants";
import { toast } from "sonner";
import type {
  DashboardOverview,
  UserDatasetSummary,
  UserPrivateDataset,
} from "@/lib/types";

// ─── Chart Color Palette ────────────────────────────────────
const COLORS = {
  cyan: "oklch(0.75 0.14 200)",
  emerald: "oklch(0.72 0.19 155)",
  amber: "oklch(0.82 0.16 80)",
  rose: "oklch(0.7 0.22 25)",
  purple: "oklch(0.65 0.2 300)",
  blue: "oklch(0.6 0.18 250)",
};
const PIE_COLORS = [COLORS.amber, COLORS.emerald, COLORS.rose];
const BAR_COLORS = [COLORS.amber, COLORS.cyan, COLORS.rose];

// ─── Animated Counter Hook ──────────────────────────────────
function useAnimatedCount(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── KPI Card ───────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  iconColor,
  label,
  value,
  subtext,
  glowColor,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: number;
  subtext?: string;
  glowColor?: string;
}) {
  const animated = useAnimatedCount(value);
  return (
    <Card
      className="glass-panel relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
      style={
        glowColor
          ? ({
              boxShadow: `0 0 30px ${glowColor}`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <CardContent className="p-5 flex items-start gap-4">
        <div
          className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center"
          style={{ background: `${iconColor}22` }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-extrabold text-foreground tabular-nums mt-0.5">
            {animated.toLocaleString()}
          </div>
          {subtext && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {subtext}
            </div>
          )}
        </div>
      </CardContent>
      {/* Subtle gradient accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent, ${iconColor}, transparent)`,
        }}
      />
    </Card>
  );
}

// ─── Custom Recharts Tooltip ────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass-panel px-3 py-2 text-xs border border-border/60 shadow-xl">
      {label && (
        <div className="font-bold text-foreground mb-1">{label}</div>
      )}
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold text-foreground">
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard Component ───────────────────────────────
export function AdminDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sheet state for user private datasets drill-down
  const [selectedUser, setSelectedUser] =
    useState<UserDatasetSummary | null>(null);
  const [userDatasets, setUserDatasets] = useState<UserPrivateDataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{
    userId: number;
    jobId: number;
    query: string;
  } | null>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminApi.getDashboardOverview();
      setData(res.data);
    } catch {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Open user drill-down
  const openUserDatasets = async (user: UserDatasetSummary) => {
    setSelectedUser(user);
    setSheetOpen(true);
    setLoadingDatasets(true);
    try {
      const res = await adminApi.getUserPrivateDatasets(user.user_id);
      setUserDatasets(res.data.datasets);
    } catch {
      toast.error("Failed to load user datasets.");
      setUserDatasets([]);
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Download a private dataset
  const handleDownload = async (userId: number, jobId: number) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const url = `${getApiBase()}/api/admin/users/${userId}/private-datasets/${jobId}/download`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const filename =
        resp.headers
          .get("content-disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || `dataset_${jobId}.xlsx`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Download started.");
    } catch {
      toast.error("Failed to download dataset file.");
    }
  };

  // Delete a private dataset
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteUserPrivateDataset(
        deleteTarget.userId,
        deleteTarget.jobId
      );
      toast.success("Private dataset deleted successfully.");
      // Refresh sheet data
      if (selectedUser) {
        const res = await adminApi.getUserPrivateDatasets(
          selectedUser.user_id
        );
        setUserDatasets(res.data.datasets);
      }
      // Refresh overview
      fetchDashboard(true);
    } catch {
      toast.error("Failed to delete dataset.");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Loading skeleton ──
  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-card/60 border border-border/30"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-xl bg-card/60 border border-border/30"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Prepare chart data ──
  const paymentPieData = Object.entries(data.payment_stats.status_counts).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    })
  );

  const requestBarData = Object.entries(
    data.dataset_request_stats.status_counts
  ).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const packageBarData = Object.entries(
    data.payment_stats.package_popularity
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const monthlyRevenueData = Object.entries(
    data.payment_stats.monthly_revenue
  )
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header Row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Platform Analytics Dashboard
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Real-time bird&apos;s eye view of all platform activity
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="gap-1.5 text-xs h-8"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          icon={Users}
          iconColor={COLORS.cyan}
          label="Total Customers"
          value={data.user_stats.total_users}
          subtext={`${data.user_stats.role_counts["user"] || 0} users · ${(data.user_stats.role_counts["admin"] || 0) + (data.user_stats.role_counts["superadmin"] || 0)} admins`}
          glowColor="oklch(0.75 0.14 200 / 0.08)"
        />
        <KpiCard
          icon={DollarSign}
          iconColor={COLORS.emerald}
          label="Total Revenue"
          value={data.payment_stats.total_revenue_bdt}
          subtext={`৳ BDT from ${data.payment_stats.status_counts["approved"] || 0} approved payments`}
          glowColor="oklch(0.72 0.19 155 / 0.08)"
        />
        <KpiCard
          icon={Clock}
          iconColor={COLORS.amber}
          label="Pending Payments"
          value={data.payment_stats.status_counts["pending"] || 0}
          subtext="Awaiting admin review"
          glowColor="oklch(0.82 0.16 80 / 0.08)"
        />
        <KpiCard
          icon={Activity}
          iconColor={COLORS.purple}
          label="Active Scraper Jobs"
          value={data.scraper_stats.running_jobs}
          subtext={`${data.scraper_stats.total_jobs} total jobs`}
          glowColor="oklch(0.65 0.2 300 / 0.08)"
        />
        <KpiCard
          icon={HardDrive}
          iconColor={COLORS.blue}
          label="Private Datasets"
          value={data.scraper_stats.total_private_datasets}
          subtext={`${data.catalog_stats.total_catalog_datasets} catalog datasets`}
          glowColor="oklch(0.6 0.18 250 / 0.08)"
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Payment Status Donut */}
        <Card className="glass-panel p-5">
          <CardContent className="p-0">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              Payment Status Distribution
            </h3>
            {paymentPieData.every((d) => d.value === 0) ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No payment data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentPieData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 2. Dataset Request Status Bar Chart */}
        <Card className="glass-panel p-5">
          <CardContent className="p-0">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Database className="h-4 w-4 text-cyan-400" />
              Dataset Request Status
            </h3>
            {requestBarData.every((d) => d.value === 0) ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No dataset requests yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={requestBarData} barSize={40}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(1 0 0 / 0.06)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "oklch(0.65 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "oklch(0.65 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {requestBarData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={BAR_COLORS[idx % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 3. Package Popularity */}
        <Card className="glass-panel p-5">
          <CardContent className="p-0">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-purple-400" />
              Subscription Package Popularity
            </h3>
            {packageBarData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No purchases yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={packageBarData}
                  layout="vertical"
                  barSize={24}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(1 0 0 / 0.06)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "oklch(0.65 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 10, fill: "oklch(0.65 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={COLORS.purple} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 4. Monthly Revenue Trend */}
        <Card className="glass-panel p-5">
          <CardContent className="p-0">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Monthly Revenue Trend (৳ BDT)
            </h3>
            {monthlyRevenueData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
                No revenue data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={COLORS.emerald}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.emerald}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(1 0 0 / 0.06)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "oklch(0.65 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "oklch(0.65 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke={COLORS.emerald}
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={{ r: 4, fill: COLORS.emerald }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Users with Private Datasets Table ── */}
      <Card className="glass-panel p-5">
        <CardContent className="p-0 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4 text-cyan-400" />
            Users with Private Datasets
            <Badge
              variant="outline"
              className="ml-2 text-[10px] border-primary/30 text-primary"
            >
              {data.users_with_datasets.length} Users
            </Badge>
          </h3>

          {data.users_with_datasets.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-12 border border-border/30 rounded-lg bg-background/50">
              No users have created private datasets yet.
            </div>
          ) : (
            <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-center">Credits</TableHead>
                    <TableHead className="text-center">
                      Total Datasets
                    </TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="text-center">
                      Total Rows
                    </TableHead>
                    <TableHead className="w-20 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users_with_datasets.map((u) => (
                    <TableRow
                      key={u.user_id}
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => openUserDatasets(u)}
                    >
                      <TableCell>
                        <div className="text-xs font-semibold text-foreground">
                          {u.full_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {u.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            u.role === "superadmin"
                              ? "border-purple-500/40 text-purple-400"
                              : u.role === "admin"
                              ? "border-rose-500/40 text-rose-400"
                              : "border-border/40 text-muted-foreground"
                          }`}
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold text-amber-500">
                        {u.credits}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-foreground">
                        {u.total_datasets}
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-emerald-400">
                        {u.completed_datasets}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-muted-foreground">
                        {u.total_rows.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUserDatasets(u);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── User Private Datasets Sheet (Drill-down) ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[560px] sm:max-w-[90vw] p-0 border-l border-border/40"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/30">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-primary" />
              Private Datasets
            </SheetTitle>
            {selectedUser && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="font-semibold text-foreground">
                  {selectedUser.full_name}
                </div>
                <div>{selectedUser.email}</div>
              </div>
            )}
          </SheetHeader>

          <div className="p-6 overflow-y-auto h-[calc(100vh-130px)] space-y-3">
            {loadingDatasets ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-card/60 border border-border/30 animate-pulse"
                  />
                ))}
              </div>
            ) : userDatasets.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-16">
                This user has no private datasets.
              </div>
            ) : (
              userDatasets.map((ds) => (
                <div
                  key={ds.id}
                  className="rounded-lg border border-border/40 bg-card/60 p-4 space-y-2 hover:border-primary/30 transition-colors"
                >
                  {/* Row 1: Query & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">
                        {ds.query}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                        {ds.division && <span>{ds.division}</span>}
                        {ds.district && (
                          <>
                            <span>›</span>
                            <span>{ds.district}</span>
                          </>
                        )}
                        {ds.area && (
                          <>
                            <span>›</span>
                            <span>{ds.area}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        ds.status === "done"
                          ? "border-emerald-500/40 text-emerald-400"
                          : ds.status === "running"
                          ? "border-amber-500/40 text-amber-500 animate-pulse"
                          : "border-destructive/40 text-destructive"
                      }`}
                    >
                      {ds.status}
                    </Badge>
                  </div>

                  {/* Row 2: Stats */}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>
                      Job #{ds.id}
                    </span>
                    <span>
                      {ds.result_count || 0} rows
                    </span>
                    <span>
                      {ds.cost_credits || 0} CR
                    </span>
                    {ds.created_at && (
                      <span>
                        {new Date(ds.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {ds.status === "done" && ds.result_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-3 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() =>
                          handleDownload(
                            selectedUser!.user_id,
                            ds.id
                          )
                        }
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] px-3 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() =>
                        setDeleteTarget({
                          userId: selectedUser!.user_id,
                          jobId: ds.id,
                          query: ds.query,
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Private Dataset"
        description={`Are you sure you want to permanently delete this private dataset? "${deleteTarget?.query}" — This will remove the file from the server and cannot be undone.`}
        confirmText="Delete Permanently"
        isDanger
      />
    </div>
  );
}
