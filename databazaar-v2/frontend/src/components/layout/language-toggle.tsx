"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/providers/language-provider";

export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLang}
      className="gap-2 rounded-lg border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 text-xs h-9"
    >
      <Globe className="h-3.5 w-3.5" />
      {lang === "en" ? "🇧🇩 বাংলা" : "🇺🇸 English"}
    </Button>
  );
}
