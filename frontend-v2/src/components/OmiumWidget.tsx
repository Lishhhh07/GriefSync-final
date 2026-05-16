import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { apiGetTraceStats, apiGetTraceLog } from "@/lib/api";

type TraceStats = {
  total_spans: number;
  errors: number;
  successes: number;
  error_rate: number;
  omium_active: boolean;
  agents: Record<string, { total: number; errors: number; avg_ms: number }>;
};

type TraceEntry = {
  timestamp: string;
  name: string;
  agent: string;
  status: string;
  duration_ms?: number;
  error?: string;
};

export function OmiumWidget() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [entries, setEntries] = useState<TraceEntry[]>([]);
  const [loading, setLoading] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([
      apiGetTraceStats().catch(() => null),
      apiGetTraceLog().catch(() => ({ entries: [] })),
    ]).then(([s, e]) => {
      if (s) setStats(s);
      setEntries((e?.entries || []) as TraceEntry[]);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  return (
    <>
      {/* Floating Omium button — bottom left */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-[100] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
        whileTap={{ scale: 0.95 }}
        title="Omium Observability"
      >
        <span className="relative flex h-3 w-3">
          {stats?.omium_active && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-40" />
          )}
          <span className={`relative h-3 w-3 rounded-full ${stats?.omium_active ? "bg-emerald" : "bg-muted-foreground/40"}`} />
        </span>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-20 left-6 z-[101] w-[360px] max-h-[480px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${stats?.omium_active ? "bg-emerald" : "bg-muted"}`} />
                <span className="text-[12px] font-medium text-foreground">Omium</span>
                <span className="text-[10px] text-muted-foreground">Observability</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadData} className="text-[10px] text-muted-foreground hover:text-foreground">↻</button>
                <button onClick={() => setOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>

            {loading && !stats ? (
              <div className="p-6 text-center text-[12px] text-muted-foreground">Loading…</div>
            ) : (
              <div className="overflow-y-auto max-h-[420px]">
                {/* Stats grid */}
                {stats && (
                  <div className="grid grid-cols-4 gap-px bg-border/50 border-b border-border">
                    <StatCell label="Spans" value={stats.total_spans} />
                    <StatCell label="OK" value={stats.successes} color="text-emerald" />
                    <StatCell label="Errors" value={stats.errors} color="text-destructive" />
                    <StatCell label="Rate" value={`${stats.error_rate}%`} color={stats.error_rate > 5 ? "text-destructive" : "text-emerald"} />
                  </div>
                )}

                {/* Agent breakdown */}
                {stats && Object.keys(stats.agents).length > 0 && (
                  <div className="border-b border-border px-4 py-3">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Agents</div>
                    <div className="space-y-1.5">
                      {Object.entries(stats.agents).map(([name, data]) => (
                        <div key={name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${data.errors > 0 ? "bg-destructive" : "bg-emerald"}`} />
                            <span className="text-[11px] text-foreground/80">{name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>{data.total} calls</span>
                            <span>{data.avg_ms}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent traces */}
                <div className="px-4 py-3">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Recent traces</div>
                  {entries.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground py-2">No traces yet</div>
                  ) : (
                    <div className="space-y-1">
                      {entries.slice(-15).reverse().map((e, i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-1 w-1 rounded-full shrink-0 ${e.status === "error" ? "bg-destructive" : "bg-emerald"}`} />
                            <span className="text-[10px] text-foreground/70 truncate">{e.name}</span>
                          </div>
                          <span className="text-[9px] text-muted-foreground tabular-nums shrink-0 ml-2">
                            {e.duration_ms || 0}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link to Omium dashboard */}
                <div className="border-t border-border px-4 py-3">
                  <a
                    href="https://app.omium.ai/project/griefsync"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  >
                    <span>Open Omium Dashboard →</span>
                    <span className="text-[9px]">app.omium.ai</span>
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatCell({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="bg-card px-3 py-2.5 text-center">
      <div className={`text-[14px] font-medium tabular-nums ${color || "text-foreground"}`}>{value}</div>
      <div className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
