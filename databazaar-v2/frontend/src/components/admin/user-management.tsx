import { useState } from "react";
import { UserCheck, ShieldAlert, AlertTriangle, Trash2, Coins, Plus, Minus, Key, Building } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api/admin";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { User } from "@/lib/types";

interface UserManagementProps {
  users: User[];
  onRefresh: () => void;
  onOpenWarningModal: (user: User) => void;
}

export function UserManagement({
  users,
  onRefresh,
  onOpenWarningModal,
}: UserManagementProps) {
  // Modal target states
  const [creditModalTarget, setCreditModalTarget] = useState<{ user: User; mode: "add" | "deduct" } | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>("50");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  const [roleTarget, setRoleTarget] = useState<{ userId: number; role: string } | null>(null);
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Brevo credentials modal state
  const [brevoTarget, setBrevoTarget] = useState<User | null>(null);
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [dailyLimit, setDailyLimit] = useState<number>(300);
  const [brevoStatus, setBrevoStatus] = useState<string>("approved");
  const [isSubmittingBrevo, setIsSubmittingBrevo] = useState(false);

  const handleOpenCreditModal = (user: User, mode: "add" | "deduct") => {
    setCreditModalTarget({ user, mode });
    setCreditAmount(mode === "add" ? "50" : "10");
  };

  const confirmAdjustCredits = async () => {
    if (!creditModalTarget) return;
    const parsed = parseInt(creditAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.warning("Please enter a valid positive credit number.");
      return;
    }

    const finalAmount = creditModalTarget.mode === "add" ? parsed : -parsed;
    setIsSubmittingCredit(true);

    try {
      await adminApi.addCredits(creditModalTarget.user.id, finalAmount);
      const actionText = creditModalTarget.mode === "add" ? `Added ${parsed} credits to` : `Deducted ${parsed} credits from`;
      toast.success(`${actionText} ${creditModalTarget.user.email}!`);
      setCreditModalTarget(null);
      onRefresh();
    } catch {
      toast.error("Failed to update user credit balance.");
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleTarget) return;
    try {
      await adminApi.updateUserRole(roleTarget.userId, roleTarget.role);
      toast.success("Role updated successfully.");
      onRefresh();
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setRoleTarget(null);
    }
  };

  const confirmBanToggle = async () => {
    if (!banTarget) return;
    const isBanning = banTarget.is_banned !== 1;
    try {
      await adminApi.banUser(banTarget.id, {
        is_banned: isBanning ? 1 : 0,
        warning_message: "Your account has been suspended for violating security policies.",
        ban_ip: true,
        ip_address: banTarget.ip_address || "",
      });
      toast.success(isBanning ? "User banned." : "User unbanned.");
      onRefresh();
    } catch {
      toast.error("Failed to update ban status.");
    } finally {
      setBanTarget(null);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const res = await adminApi.deleteUser(deleteTarget.id);
      if (res.data.success) {
        toast.success("User permanently deleted.");
        onRefresh();
      }
    } catch {
      toast.error("Failed to delete user.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleOpenBrevoModal = (user: User) => {
    setBrevoTarget(user);
    setBrevoApiKey(user.brevo_api_key || `xkeysib-${Math.random().toString(36).substring(2, 12)}`);
    setDailyLimit(user.daily_email_limit || 300);
    setBrevoStatus(user.brevo_account_status || "approved");
  };

  const confirmBrevoConfig = async () => {
    if (!brevoTarget) return;
    setIsSubmittingBrevo(true);
    try {
      await marketingApi.updateUserBrevoConfig(brevoTarget.id, {
        api_key: brevoApiKey,
        daily_limit: Number(dailyLimit) || 300,
        account_status: brevoStatus,
      });
      toast.success(`Updated Brevo configuration for ${brevoTarget.email}!`);
      setBrevoTarget(null);
      onRefresh();
    } catch {
      toast.error("Failed to update Brevo configuration.");
    } finally {
      setIsSubmittingBrevo(false);
    }
  };

  const calcNewBalance = () => {
    if (!creditModalTarget) return 0;
    const current = creditModalTarget.user.credits || 0;
    const parsed = parseInt(creditAmount) || 0;
    if (creditModalTarget.mode === "add") return current + parsed;
    return Math.max(0, current - parsed);
  };

  return (
    <Card className="glass-panel p-6">
      <CardContent className="p-0 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Customer Accounts & Credit Balances Management</h3>

        <div className="rounded-lg border border-border/40 overflow-hidden bg-background/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID #</TableHead>
                <TableHead>Customer Email / Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Credits Balance</TableHead>
                <TableHead>Status / Warning</TableHead>
                <TableHead className="w-72 text-right">Actions (Credits / Brevo API / Notice / Ban)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{u.id}</TableCell>
                  <TableCell className="text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span>{u.email}</span>
                      {u.brevo_account_status === "email_verified" && (
                        <Badge variant="outline" className="text-[9px] border-cyan-500/40 text-cyan-400 font-mono">
                          Email Verified
                        </Badge>
                      )}
                      {u.brevo_account_status === "approved" && (
                        <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400 font-mono">
                          API Active
                        </Badge>
                      )}
                      {u.brevo_account_status === "pending_email_verification" && (
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400 font-mono">
                          Brevo Email Sent
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{u.full_name}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Select
                      value={u.role}
                      onValueChange={(role) => role && setRoleTarget({ userId: u.id, role })}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-amber-500">
                    {u.credits} CR
                  </TableCell>
                  <TableCell>
                    {u.is_banned === 1 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        BANNED
                      </Badge>
                    ) : u.warning_message ? (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40">
                        Warning Issued
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      {/* ADD CREDITS BUTTON */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCreditModal(u, "add")}
                        className="h-7 text-[11px] px-2 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10 gap-1 font-bold"
                        title="Add Credits (+)"
                      >
                        CR
                      </Button>

                      {/* BREVO CONFIG BUTTON */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenBrevoModal(u)}
                        className="h-7 text-[11px] px-2 text-purple-400 border-purple-500/40 hover:bg-purple-500/10 gap-1 font-mono"
                        title="Brevo API Key & Daily Limits"
                      >
                        <Key className="h-3 w-3" /> Brevo
                      </Button>

                      {/* WARNING BUTTON */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenWarningModal(u)}
                        className="h-7 text-[11px] px-2 text-purple-400 border-purple-500/40 hover:bg-purple-500/10 gap-1"
                        title="Issue Notice Warning"
                      >
                        <AlertTriangle className="h-3 w-3" /> Warning
                      </Button>

                      {/* BAN BUTTON */}
                      <Button
                        size="sm"
                        variant={u.is_banned === 1 ? "outline" : "destructive"}
                        onClick={() => setBanTarget(u)}
                        className="h-7 text-[11px] px-2 gap-1"
                      >
                        {u.is_banned === 1 ? <UserCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {u.is_banned === 1 ? "Unban" : "Ban"}
                      </Button>

                      {/* DELETE BUTTON */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(u)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        title="Delete Account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dedicated Credit Add / Deduct Modal */}
      <Dialog open={!!creditModalTarget} onOpenChange={(v) => !v && setCreditModalTarget(null)}>
        <DialogContent className="glass-panel border-border/40 sm:max-w-md p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <span>
                {creditModalTarget?.mode === "add" ? "Add Usage Credits (+)" : "Deduct Usage Credits (-)"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Target Customer: <span className="text-foreground font-semibold">{creditModalTarget?.user.email}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher */}
          <div className="flex bg-muted/40 p-1 rounded-lg gap-1 border border-border/40 my-2">
            <button
              type="button"
              onClick={() => setCreditModalTarget((prev) => prev ? { ...prev, mode: "add" } : null)}
              className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-all flex items-center justify-center gap-1 ${creditModalTarget?.mode === "add"
                ? "bg-emerald-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Plus className="h-3.5 w-3.5" /> Add Credits (+)
            </button>

            <button
              type="button"
              onClick={() => setCreditModalTarget((prev) => prev ? { ...prev, mode: "deduct" } : null)}
              className={`flex-1 text-xs py-1.5 font-bold rounded-md transition-all flex items-center justify-center gap-1 ${creditModalTarget?.mode === "deduct"
                ? "bg-rose-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Minus className="h-3.5 w-3.5" /> Deduct Credits (-)
            </button>
          </div>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Credit Amount *</Label>
              <Input
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter credit amount..."
                className="text-xs h-9 font-mono"
              />
            </div>

            {/* Live Balance Preview Box */}
            <div className="p-3 rounded-lg border border-border/40 bg-black/40 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Current Balance:</span>
                <span className="font-bold text-foreground">{creditModalTarget?.user.credits || 0} CR</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Adjustment ({creditModalTarget?.mode === "add" ? "+" : "-"}):</span>
                <span className={creditModalTarget?.mode === "add" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {creditModalTarget?.mode === "add" ? "+" : "-"}{parseInt(creditAmount) || 0} CR
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/40 text-foreground font-bold">
                <span>New Balance:</span>
                <span className="text-amber-400">{calcNewBalance()} CR</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => setCreditModalTarget(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSubmittingCredit}
              onClick={confirmAdjustCredits}
              className={`text-xs font-bold text-white ${creditModalTarget?.mode === "add"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-rose-600 hover:bg-rose-500"
                }`}
            >
              {isSubmittingCredit
                ? "Updating..."
                : creditModalTarget?.mode === "add"
                  ? "Confirm Add Credits"
                  : "Confirm Deduct Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirm Modal */}
      <ConfirmModal
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        onConfirm={confirmRoleChange}
        title="Change User Role"
        description={`Are you sure you want to update this user's permission role to "${roleTarget?.role?.toUpperCase()}"?`}
        confirmText="Update Role"
      />

      {/* Ban / Unban Confirm Modal */}
      <ConfirmModal
        open={!!banTarget}
        onClose={() => setBanTarget(null)}
        onConfirm={confirmBanToggle}
        title={banTarget?.is_banned === 1 ? "Unban Customer Account" : "Ban Customer Account"}
        description={`Are you sure you want to ${banTarget?.is_banned === 1 ? "UNBAN" : "BAN"} user #${banTarget?.id} (${banTarget?.email})?`}
        confirmText={banTarget?.is_banned === 1 ? "Unban Account" : "Ban Account"}
        isDanger={banTarget?.is_banned !== 1}
      />

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
        title={`Permanently Delete User #${deleteTarget?.id}?`}
        description={`This will permanently unregister and delete account ${deleteTarget?.email} from the database. This action CANNOT be undone.`}
        confirmText="Delete Account"
        isDanger
      />

      {/* Brevo Config Modal */}
      <Dialog open={!!brevoTarget} onOpenChange={(open) => !open && setBrevoTarget(null)}>
        <DialogContent className="sm:max-w-md bg-card border-purple-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <Key className="h-5 w-5" /> Brevo API Key & Limits ({brevoTarget?.email})
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manually assign or edit this customer's Brevo API Key, daily dispatch limits, and verification status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Brevo API Key *</Label>
              <Input
                placeholder="xkeysib-..."
                value={brevoApiKey}
                onChange={(e) => setBrevoApiKey(e.target.value)}
                className="text-xs font-mono h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Daily Email Dispatch Limit *</Label>
              <Input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                min={10}
                max={50000}
                className="text-xs h-9"
              />
              <p className="text-[10px] text-muted-foreground">Maximum emails allowed per 24-hour cycle (default: 300).</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Verification Status</Label>
              <Select value={brevoStatus} onValueChange={(val) => val && setBrevoStatus(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved & Active</SelectItem>
                  <SelectItem value="email_verified">Email Verified (Ready for API Key)</SelectItem>
                  <SelectItem value="pending_email_verification">Awaiting Customer Brevo Email</SelectItem>
                  <SelectItem value="pending">Application Pending Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="none">None / Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="ghost" onClick={() => setBrevoTarget(null)} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              onClick={confirmBrevoConfig}
              disabled={isSubmittingBrevo}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8"
            >
              {isSubmittingBrevo ? "Saving Config..." : "Save Brevo Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
