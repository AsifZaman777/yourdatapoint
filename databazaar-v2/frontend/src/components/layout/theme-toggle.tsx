"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-accent cursor-pointer">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-panel">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 cursor-pointer">
          <Sun className="h-4 w-4" />
          <span>Ocean Light</span>
          {theme === "light" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 cursor-pointer">
          <Moon className="h-4 w-4" />
          <span>Cyber Dark</span>
          {theme === "dark" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("purple")} className="gap-2 cursor-pointer">
          <Sparkles className="h-4 w-4" />
          <span>Midnight Purple</span>
          {theme === "purple" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
