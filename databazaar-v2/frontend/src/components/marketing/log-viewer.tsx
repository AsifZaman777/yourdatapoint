"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { marketingApi } from "@/lib/api/marketing";
import type { LogFile, LogFileContent } from "@/lib/types";

export function LogViewer() {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [fileContent, setFileContent] = useState<LogFileContent | null>(null);

  useEffect(() => {
    marketingApi
      .logFiles()
      .then((res) => setLogFiles(res.data))
      .catch(() => {});
  }, []);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    marketingApi
      .logFileContent(date)
      .then((res) => setFileContent(res.data))
      .catch(() => {});
  };

  return (
    <Card className="glass-panel p-6">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <FileText className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-foreground">Daily System Execution Logs</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Files List Sidebar */}
          <div className="md:col-span-4 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Log Date Archives:
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {logFiles.map((f) => (
                <Button
                  key={f.date}
                  variant={selectedDate === f.date ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectDate(f.date)}
                  className="w-full justify-between text-xs h-8 font-mono"
                >
                  <span>{f.date}</span>
                  <span className="text-[10px] opacity-70">({(f.size / 1024).toFixed(1)} KB)</span>
                </Button>
              ))}

              {logFiles.length === 0 && (
                <div className="text-xs text-muted-foreground italic py-4">No log files found.</div>
              )}
            </div>
          </div>

          {/* Content Viewer Box */}
          <div className="md:col-span-8 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              {selectedDate ? `Viewing Log: ${selectedDate}` : "Select a log date to inspect"}
            </div>
            <div className="h-[300px] overflow-y-auto rounded-lg bg-black/90 p-4 font-mono text-xs text-emerald-400 border border-border/40 select-text">
              {fileContent ? (
                fileContent.lines.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground italic">Select a date file from the left to view logs.</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
