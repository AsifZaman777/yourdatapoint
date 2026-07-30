"use client";

import { useState, type FormEvent } from "react";
import { User as UserIcon, Mail, Lock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/providers/language-provider";
import { authApi } from "@/lib/api/auth";

interface RegisterFormProps {
  onSuccess: (notice: string) => void;
  onToggleView: () => void;
}

export function RegisterForm({ onSuccess, onToggleView }: RegisterFormProps) {
  const { t } = useLanguage();
  const at = t.auth || {};

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await authApi.register({
        full_name: fullName,
        email,
        password,
      });
      const msg = res.data.message || "Account created! Check email for activation link.";
      toast.success(msg);
      onSuccess(msg);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Registration failed. Try another email.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
          <UserIcon className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">{at.createAccountTitle || "Create Account"}</h2>
        <p className="text-xs text-muted-foreground">
          {at.createAccountDesc || "Register to access Bangladesh's premier B2B lead platform"}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reg-name">{at.fullNameLabel || "Full Name *"}</Label>
          <div className="relative">
            <Input
              id="reg-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="John Doe"
              className="pl-10"
            />
            <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-email">{at.emailLabel || "Email Address *"}</Label>
          <div className="relative">
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
              className="pl-10"
            />
            <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-password">{at.passwordLabel || "Password *"}</Label>
          <div className="relative">
            <Input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="pl-10"
            />
            <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full font-bold py-5">
          {isSubmitting ? (at.btnRegistering || "Registering...") : (at.btnRegister || "Register Account")}
        </Button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        {at.alreadyRegistered || "Already registered?"}{" "}
        <button
          type="button"
          onClick={onToggleView}
          className="text-amber-500 font-semibold hover:underline"
        >
          {at.signInHere || "Sign In Here"}
        </button>
      </div>
    </div>
  );
}
