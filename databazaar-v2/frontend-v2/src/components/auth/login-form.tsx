"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { useLanguage } from "@/providers/language-provider";
import { authApi } from "@/lib/api/auth";

interface LoginFormProps {
  onToggleView: () => void;
  verificationNotice?: string;
}

export function LoginForm({ onToggleView, verificationNotice }: LoginFormProps) {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const at = t.auth || {};

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await authApi.login({ email, password });
      toast.success("Signed in successfully!");
      login(res.data.token, res.data.user);

      if (res.data.user.role === "admin" || res.data.user.role === "superadmin") {
        router.push("/admin");
      } else {
        router.push("/catalog");
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Authentication failed. Check credentials.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.warning("Please enter your email address first.");
      return;
    }
    try {
      const res = await authApi.resendVerification(email);
      toast.success(res.data.message || "Verification link sent to your email!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to resend verification.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/20 text-primary mb-2">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">{at.signInTitle || "Sign In"}</h2>
        <p className="text-xs text-muted-foreground">
          {at.signInDesc || "Enter your credentials to access your lead dashboard"}
        </p>
      </div>

      {verificationNotice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{verificationNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          {error.includes("not verified") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResend}
              className="w-full text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              {at.resendEmailBtn || "Resend Verification Link Email"}
            </Button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">{at.emailLabel || "Email Address *"}</Label>
          <div className="relative">
            <Input
              id="login-email"
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
          <Label htmlFor="login-password">{at.passwordLabel || "Password *"}</Label>
          <div className="relative">
            <Input
              id="login-password"
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
          {isSubmitting ? (at.btnSigningIn || "Signing in...") : (at.btnSignIn || "Sign In")}
        </Button>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        {at.noAccount || "No account?"}{" "}
        <button
          type="button"
          onClick={onToggleView}
          className="text-amber-500 font-semibold hover:underline"
        >
          {at.registerHere || "Register Here"}
        </button>
      </div>
    </div>
  );
}
