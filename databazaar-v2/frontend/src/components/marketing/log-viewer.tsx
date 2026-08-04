"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, Download, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal-confirm";
import { useAuth } from "@/providers/auth-provider";
import { marketingApi } from "@/lib/api/marketing";
import { toast } from "sonner";
import type { LogFile, LogFileContent } from "@/lib/types";

export function LogViewer() {
  const { isAdmin } = useAuth();
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [fileContent, setFileContent] = useState<LogFileContent | null>(null);
  const [deleteTargetDate, setDeleteTargetDate] = useState<string | null>(null);

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

  const handleDownload = (date: string) => {
    if (!fileContent && selectedDate !== date) {
      marketingApi.logFileContent(date).then((res) => {
        triggerDownload(date, res.data.content);
      }).catch(() => toast.error("Failed to download log file."));
      return;
    }
    triggerDownload(date, fileContent?.content || "");
  };

  const triggerDownload = (date: string, text: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${date}_campaigns.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${date}_campaigns.log`);
  };

  const confirmDeleteLogFile = async () => {
    if (!deleteTargetDate) return;
    try {
      await marketingApi.deleteLogFile(deleteTargetDate);
      toast.success(`Log file for ${deleteTargetDate} deleted successfully.`);
      setLogFiles((prev) => prev.filter((f) => f.date !== deleteTargetDate));
      if (selectedDate === deleteTargetDate) {
        setSelectedDate("");
        setFileContent(null);
      }
    } catch {
      toast.error("Failed to delete log file.");
    } finally {
      setDeleteTargetDate(null);
    }
  };

  return (
    <Card className="glass-panel p-6">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-foreground">Daily System Execution Logs</h3>
          </div>
          {selectedDate && fileContent && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(selectedDate)}
                className="h-8 gap-1.5 text-xs border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Download className="h-3.5 w-3.5" /> Download Log
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteTargetDate(selectedDate)}
                  className="h-8 gap-1.5 text-xs border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Log
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Files List Sidebar */}
          <div className="md:col-span-4 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Log Date Archives:
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {logFiles.map((f) => (
                <div key={f.date} className="flex items-center gap-1">
                  <Button
                    variant={selectedDate === f.date ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectDate(f.date)}
                    className="flex-1 justify-between text-xs h-8 font-mono truncate"
                  >
                    <span className="truncate">{f.date}</span>
                    <span className="text-[10px] opacity-70 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDownload(f.date)}
                    className="h-8 w-8 text-cyan-400 hover:bg-cyan-500/10 shrink-0"
                    title="Download Log"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTargetDate(f.date)}
                      className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 shrink-0"
                      title="Delete Log File"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}

              {logFiles.length === 0 && (
                <div className="text-xs text-muted-foreground italic py-4">No log files found.</div>
              )}
            </div>
          </div>

          {/* Content Viewer Box */}
          <div className="md:col-span-8 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>{selectedDate ? `Viewing Log: ${selectedDate}_campaigns.log` : "Select a log date to inspect"}</span>
              {fileContent && (
                <span className="text-[11px] font-mono text-cyan-400">({fileContent.lines.length} lines)</span>
              )}
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

      <ConfirmModal
        open={!!deleteTargetDate}
        onClose={() => setDeleteTargetDate(null)}
        onConfirm={confirmDeleteLogFile}
        title="Delete Log Archive File"
        description={`Are you sure you want to permanently delete the log archive file for ${deleteTargetDate}?`}
        confirmText="Delete File"
        isDanger
      />
    </Card>
  );
}
