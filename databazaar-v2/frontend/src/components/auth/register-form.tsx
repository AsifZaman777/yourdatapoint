"use client";

import { useState, useMemo, type FormEvent } from "react";
import { User as UserIcon, Mail, Lock, AlertTriangle, Eye, EyeOff, Check, X, ShieldCheck } from "lucide-react";
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
  const at = (t as any).auth || {};

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-muted", text: "text-muted-foreground" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score += 1;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500", text: "text-rose-400" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500", text: "text-amber-400" };
    if (score === 3) return { score: 75, label: "Good", color: "bg-cyan-500", text: "text-cyan-400" };
    return { score: 100, label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
  }, [password]);

  // Real-time password match checks
  const isConfirmTouched = confirmPassword.length > 0;
  const isPasswordMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      const msg = "Please enter your full name (at least 2 characters).";
      setError(msg);
      toast.error(msg);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Please provide a valid email address.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (password.length < 6) {
      const msg = at.passwordTooShort || "Password must be at least 6 characters.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = at.passwordMismatch || "Passwords do not match.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await authApi.register({
        full_name: trimmedName,
        email: trimmedEmail,
        password,
      });
      const msg = res.data.message || "Account created! Check email for activation link.";
      toast.success(msg);
      onSuccess(msg);
    } catch (err: any) {
      let msg = "Registration failed. Try another email.";
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
      } else if (detail && typeof detail === "object") {
        msg = detail.message || JSON.stringify(detail);
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2 shadow-sm shadow-emerald-500/10">
          <UserIcon className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
          {at.createAccountTitle || "Create Account"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {at.createAccountDesc || "Register to access Bangladesh's premier B2B lead platform"}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-name" className="text-xs font-semibold">
            {at.fullNameLabel || "Full Name *"}
          </Label>
          <div className="relative">
            <Input
              id="reg-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="e.g. Asif Zaman"
              className="pl-10 h-10 text-sm bg-background/50 border-input/60 focus:border-primary"
            />
            <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Email Address */}
        <div className="space-y-1.5">
          <Label htmlFor="reg-email" className="text-xs font-semibold">
            {at.emailLabel || "Email Address *"}
          </Label>
          <div className="relative">
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@company.com"
              className="pl-10 h-10 text-sm bg-background/50 border-input/60 focus:border-primary"
            />
            <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="reg-password" className="text-xs font-semibold">
              {at.passwordLabel || "Password *"}
            </Label>
            {password && (
              <span className={`text-[11px] font-medium ${passwordStrength.text}`}>
                {passwordStrength.label}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="pl-10 pr-10 h-10 text-sm bg-background/50 border-input/60 focus:border-primary"
            />
            <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password Strength Bar */}
          {password.length > 0 && (
            <div className="space-y-1 pt-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${passwordStrength.score}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tip: Combine numbers and special characters for higher security
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="reg-confirm-password" className="text-xs font-semibold">
              {at.confirmPasswordLabel || "Confirm Password *"}
            </Label>
            {isConfirmTouched && (
              <span
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  isPasswordMatch ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {isPasswordMatch ? (
                  <>
                    <Check className="h-3 w-3" />
                    {at.passwordsMatch || "Passwords match"}
                  </>
                ) : (
                  <>
                    <X className="h-3 w-3" />
                    {at.passwordMismatch || "Does not match"}
                  </>
                )}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="reg-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter your password"
              className={`pl-10 pr-10 h-10 text-sm bg-background/50 border-input/60 focus:border-primary transition-colors ${
                isConfirmTouched
                  ? isPasswordMatch
                    ? "border-emerald-500/60 focus:border-emerald-500"
                    : "border-amber-500/60 focus:border-amber-500"
                  : ""
              }`}
            />
            <ShieldCheck className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || (isConfirmTouched && !isPasswordMatch)}
          className="w-full font-bold py-5 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
              {at.btnRegistering || "Registering..."}
            </span>
          ) : (
            at.btnRegister || "Register Account"
          )}
        </Button>
      </form>

      {/* Switch to Sign In */}
      <div className="text-center text-xs text-muted-foreground pt-2">
        {at.alreadyRegistered || "Already registered?"}{" "}
        <button
          type="button"
          onClick={onToggleView}
          className="text-emerald-400 font-semibold hover:underline focus:outline-none"
        >
          {at.signInHere || "Sign In Here"}
        </button>
      </div>
    </div>
  );
}
