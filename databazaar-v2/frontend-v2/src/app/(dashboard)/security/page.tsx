"use client";

import { useState, useEffect, useCallback } from "react";
import { SecurityViolations } from "@/components/admin/security-violations";
import { adminApi } from "@/lib/api/admin";
import { useLanguage } from "@/providers/language-provider";
import type { SecurityViolation } from "@/lib/types";

export default function SecurityPage() {
  const { t } = useLanguage();
  const st = t.security || {};
  const [violations, setViolations] = useState<SecurityViolation[]>([]);

  const loadViolations = useCallback(() => {
    adminApi
      .listViolations()
      .then((res) => setViolations(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadViolations();
  }, [loadViolations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{st.title || "Security Control Module"}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {st.subtitle || "Monitor intercepted screenshot attempts, DevTools focus grabs, and security sensor violation logs"}
        </p>
      </div>

      <SecurityViolations violations={violations} onRefresh={loadViolations} />
    </div>
  );
}
