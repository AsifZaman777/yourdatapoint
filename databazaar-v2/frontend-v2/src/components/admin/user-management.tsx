"use client";

import { useState } from "react";
import { Coins, ShieldAlert, UserX, AlertTriangle, UserCheck } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const handleAddCredits = async (user: User) => {
    const amountStr = prompt(`Assign credits to ${user.email} (Current: ${user.credits} CR):`, "50");
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount === 0) {
      toast.warning("Please enter a valid non-zero amount.");
      return;
    }

    try {
      await adminApi.addCredits(user.id, amount);
      toast.success(`Assigned ${amount} credits to ${user.email}!`);
      onRefresh();
    } catch {
      toast.error("Failed to assign credits.");
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!confirm(`Change user's role to ${newRole.toUpperCase()}?`)) return;
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success("Role updated.");
      onRefresh();
    } catch {
      toast.error("Failed to update role.");
    }
  };

  const handleBanToggle = async (user: User) => {
    const isBanning = user.is_banned !== 1;
    if (!confirm(`${isBanning ? "BAN" : "UNBAN"} user #${user.id}?`)) return;
    try {
      await adminApi.banUser(user.id, {
        is_banned: isBanning ? 1 : 0,
        warning_message: "Your account has been suspended for violating security policies.",
        ban_ip: true,
        ip_address: user.ip_address || "",
      });
      toast.success(isBanning ? "User banned." : "User unbanned.");
      onRefresh();
    } catch {
      toast.error("Failed to update ban status.");
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`⚠️ PERMANENTLY DELETE user #${user.id} (${user.email})? This action cannot be undone.`)) return;
    try {
      const res = await adminApi.deleteUser(user.id);
      if (res.data.success) {
        toast.success("User permanently deleted.");
        onRefresh();
      } else {
        toast.error(res.data.detail || "Failed to delete user.");
      }
    } catch {
      toast.error("Failed to delete user.");
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
                <TableHead className="text-right">Actions</TableHead>
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
                    <Select value={u.role} onValueChange={(role) => role && handleRoleChange(u.id, role)}>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddCredits(u)}
                        className="h-7 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1"
                        title="Add Credits"
                      >
                        <Coins className="h-3.5 w-3.5" /> +CR
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenWarningModal(u)}
                        className="h-7 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1"
                        title="Issue Warning"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> Warning
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBanToggle(u)}
                        className={`h-7 text-xs gap-1 ${
                          u.is_banned === 1
                            ? "border-emerald-500/40 text-emerald-400"
                            : "border-destructive/40 text-destructive"
                        }`}
                        title={u.is_banned === 1 ? "Unban User" : "Ban User"}
                      >
                        {u.is_banned === 1 ? <UserCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteUser(u)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        title="Delete User"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-xs text-muted-foreground">
                    No customer accounts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
