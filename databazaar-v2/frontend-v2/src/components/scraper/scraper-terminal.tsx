"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Terminal, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ScraperTerminalProps {
  logs: string[];
  liveImage: string | null;
  activeJobId: number | null;
}

export function ScraperTerminal({ logs, liveImage, activeJobId }: ScraperTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Card className="glass-panel p-6 border-cyan-500/30">
      <CardContent className="p-0 space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-foreground font-mono">
              Live Terminal Output {activeJobId ? `[Job #${activeJobId}]` : ""}
            </h2>
          </div>
          {activeJobId && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              JOB ACTIVE
            </div>
          )}
        </div>

        {/* Live Browser Debug Image */}
        {liveImage && (
          <div className="relative rounded-lg border border-border/50 overflow-hidden bg-black max-h-[250px]">
            <Image
              src={`data:image/jpeg;base64,${liveImage}`}
              alt="Live Scraper Browser Screenshot"
              width={600}
              height={300}
              className="w-full h-auto object-contain"
            />
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 rounded text-[10px] font-mono text-cyan-400 flex items-center gap-1">
              <Eye className="h-3 w-3" /> LIVE DRIVER STREAM
            </div>
          </div>
        )}

        {/* Terminal Log Box */}
        <div
          ref={terminalRef}
          className="h-[220px] overflow-y-auto rounded-lg bg-black/90 p-4 font-mono text-xs text-emerald-400 space-y-1 border border-border/40 select-text"
        >
          {logs.length > 0 ? (
            logs.map((line, idx) => (
              <div key={idx} className="leading-relaxed">
                {line}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground italic">
              {activeJobId ? "Waiting for job output logs..." : "No active job running. Launch a job to see logs."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
