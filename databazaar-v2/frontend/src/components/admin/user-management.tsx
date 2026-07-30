"use client";

import { useState } from "react";
import { UserCheck, ShieldAlert, AlertTriangle, Trash2, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { PromptModal } from "@/components/ui/modal-prompt";
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
  const [creditTarget, setCreditTarget] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ userId: number; role: string } | null>(null);
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const confirmAddCredits = async (amountStr: string) => {
    if (!creditTarget || !amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount === 0) {
      toast.warning("Please enter a valid non-zero amount.");
      return;
    }

    try {
      await adminApi.addCredits(creditTarget.id, amount);
      toast.success(`Assigned ${amount} credits to ${creditTarget.email}!`);
      onRefresh();
    } catch {
      toast.error("Failed to assign credits.");
    } finally {
      setCreditTarget(null);
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
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{u.id}</TableCell>
                  <TableCell className="text-xs font-semibold">
                    <div>{u.email}</div>
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
                    <div className="flex justify-end items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCreditTarget(u)}
                        className="h-7 text-[11px] px-2 text-amber-500 border-amber-500/40 hover:bg-amber-500/10 gap-1"
                        title="Add Usage Credits"
                      >
                        <Coins className="h-3 w-3" /> +CR
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenWarningModal(u)}
                        className="h-7 text-[11px] px-2 text-purple-400 border-purple-500/40 hover:bg-purple-500/10 gap-1"
                        title="Issue Notice Warning"
                      >
                        <AlertTriangle className="h-3 w-3" /> Warning
                      </Button>

                      <Button
                        size="sm"
                        variant={u.is_banned === 1 ? "outline" : "destructive"}
                        onClick={() => setBanTarget(u)}
                        className="h-7 text-[11px] px-2 gap-1"
                      >
                        {u.is_banned === 1 ? <UserCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {u.is_banned === 1 ? "Unban" : "Ban"}
                      </Button>

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

      {/* Credit Prompt Modal */}
      <PromptModal
        open={!!creditTarget}
        onClose={() => setCreditTarget(null)}
        onConfirm={confirmAddCredits}
        title={`Assign Credits to ${creditTarget?.email}`}
        description={`Current balance: ${creditTarget?.credits || 0} CR. Enter the number of credits to assign:`}
        defaultValue="50"
        placeholder="Enter credit amount (e.g. 50)..."
        confirmText="Assign Credits"
      />

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
        title="Permanently Delete User Account"
        description={`⚠️ Are you sure you want to PERMANENTLY DELETE user #${deleteTarget?.id} (${deleteTarget?.email})? This action cannot be undone.`}
        confirmText="Delete Account"
        isDanger
      />
    </Card>
  );
}
