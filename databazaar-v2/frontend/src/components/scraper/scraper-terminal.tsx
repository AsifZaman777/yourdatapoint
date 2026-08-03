"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal, Eye, Wifi, WifiOff, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getWsBase, TOKEN_KEY } from "@/lib/constants";

type StreamStatus = "idle" | "connecting" | "live" | "ended" | "error";

interface ScraperTerminalProps {
  logs: string[];
  activeJobId: number | null;
}

export function ScraperTerminal({ logs, activeJobId }: ScraperTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [frameCount, setFrameCount] = useState(0);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Cleanup helper
  const closeWebSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // WebSocket connection manager
  useEffect(() => {
    if (!activeJobId) {
      closeWebSocket();
      setStreamStatus("idle");
      setLiveFrame(null);
      setFrameCount(0);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setStreamStatus("error");
      return;
    }

    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;

      closeWebSocket();
      setStreamStatus("connecting");

      const wsUrl = `${getWsBase()}/ws/scraper/${activeJobId}/stream?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCancelled) return;
        setStreamStatus("live");
      };

      ws.onmessage = (event) => {
        if (isCancelled) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "frame" && msg.image) {
            setLiveFrame(`data:image/jpeg;base64,${msg.image}`);
            setFrameCount((prev) => prev + 1);
          } else if (msg.type === "job_ended") {
            setStreamStatus("ended");
            closeWebSocket();
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        if (isCancelled) return;
        setStreamStatus("error");
      };

      ws.onclose = (event) => {
        if (isCancelled) return;
        // Auto-reconnect if job is still active and wasn't a clean close
        if (event.code !== 1000 && event.code !== 4001) {
          setStreamStatus("connecting");
          reconnectTimerRef.current = setTimeout(() => {
            if (!isCancelled) connect();
          }, 2000);
        }
      };
    };

    connect();

    return () => {
      isCancelled = true;
      closeWebSocket();
    };
  }, [activeJobId, closeWebSocket]);

  // Stream status badge
  const statusBadge = () => {
    switch (streamStatus) {
      case "live":
        return (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE STREAM
            <span className="text-emerald-400/60">({frameCount}f)</span>
          </div>
        );
      case "connecting":
        return (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400">
            <Wifi className="h-3 w-3 animate-pulse" />
            CONNECTING...
          </div>
        );
      case "ended":
        return (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <WifiOff className="h-3 w-3" />
            STREAM ENDED
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
            <WifiOff className="h-3 w-3" />
            CONNECTION ERROR
          </div>
        );
      default:
        return null;
    }
  };

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
          <div className="flex items-center gap-3">
            {statusBadge()}
            {activeJobId && streamStatus !== "live" && streamStatus !== "connecting" && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                JOB ACTIVE
              </div>
            )}
          </div>
        </div>

        {/* Live Browser Stream */}
        {liveFrame && (
          <div className="relative rounded-lg border border-border/50 overflow-hidden bg-black max-h-[280px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={liveFrame}
              alt="Live Scraper Browser Stream"
              className="w-full h-auto object-contain"
            />
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 rounded text-[10px] font-mono text-cyan-400 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {streamStatus === "live" ? "LIVE DRIVER STREAM" : "LAST FRAME"}
            </div>
            {streamStatus === "live" && (
              <div className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            )}
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
