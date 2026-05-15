import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { apiGetMonitorLogs, apiGetQueueStatus, apiDrainQueue, apiGetTraceLog, apiGetTraceStats } from "@/lib/api";

export const Route = createFileRoute("/dashboard/activity")({
  component: ActivityPage,
});

type LogEntry = { t: string; lvl: string; agent: string; msg: string; ms: number };
type TraceEntry = { timestamp: string; name: string; agent: string; status: string; duration_ms?: number; error?: string; output?: Record<string, unknown> };
type TraceStats = { total_spans: number; errors: number; successes: number; error_rate: number; omium_active: boolean; agents: Record<string, { total: number; errors: number; avg_ms: number }> };

const lvlColor: Record<string, string> = {
  info: "text-cyan-soft",
  warn: "text-gold",
  ok: "text-emerald",
  err: "text-destructive",
  error: "text-destructive",
};

function ActivityPage() {
  const [stream, setStream] = useState<LogEntry[]>([]);
  const [queue, setQueue] = useState<{ pending: number; done_last_hour: number; failed: number } | null>(null);
  const [draining, setDraining] = useState(false);
  const [traceEntries, setTraceEntries] = useState<TraceEntry[]>([]);
  const [traceStats, setTraceStats] = useState<TraceStats | null>(null);

  function loadData() {
    apiGetMonitorLogs()
      .then((res) => {
        if (res.logs && res.logs.length > 0) {
          setStream(
            res.logs.map((l: Record<string, unknown>) => ({
              t: ((l.logged_at as string) || "").split("T")[1]?.slice(0, 8) || "—",
              lvl: (l.level as string) || "info",
              agent: (l.agent as string) || "system",
              msg: (l.message as string) || "",
              ms: (l.duration_ms as number) || 0,
            }))
          );
        }
      })
      .catch(() => {});
    apiGetQueueStatus().then(setQueue).catch(() => {});
    apiGetTraceLog()
      .then((res) => setTraceEntries(res.entries as TraceEntry[]))
      .catch(() => {});
    apiGetTraceStats()
      .then((res) => setTraceStats(res))
      .catch(() => {});
  }

  useEffect(() => { loadData(); }, []);

  async function handleDrain() {
    setDraining(true);
    try {
      await apiDrainQueue();
      loadData();
    } catch { /* ignore */ }
    setDraining(false);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald">Autonomous operations</div>
          <h1 className="mt-3 font-display text-4xl font-light tracking-tight md:text-5xl">
            What the agents are <em className="italic text-gold">doing right now.</em>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 text-[11.5px] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
            {queue ? `${queue.pending} pending · ${queue.done_last_hour} done · ${queue.failed} failed` : "Loading…"}
          </div>
          {queue && queue.pending > 0 && (
            <button
              onClick={handleDrain}
              disabled={draining}
              className="rounded-md border border-gold/40 bg-gold/10 px-3 py-1.5 text-[11.5px] text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
            >
              {draining ? "Draining…" : "Drain queue now"}
            </button>
          )}
        </div>
      </div>

      {/* Omium Trace Stats */}
      {traceStats && (
        <section className="rounded-2xl border border-border bg-card/40 p-5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Omium Observability</div>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${traceStats.omium_active ? "bg-emerald" : "bg-muted"}`} />
              <span className="text-[10.5px] text-muted-foreground">{traceStats.omium_active ? "Connected" : "Inactive"}</span>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total spans</div>
              <div className="mt-1 font-display text-2xl">{traceStats.total_spans}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald">Successes</div>
              <div className="mt-1 font-display text-2xl text-emerald">{traceStats.successes}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-destructive">Errors</div>
              <div className="mt-1 font-display text-2xl text-destructive">{traceStats.errors}</div>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Error rate</div>
              <div className="mt-1 font-display text-2xl text-gold">{traceStats.error_rate}%</div>
            </div>
          </div>

          {/* Per-agent breakdown */}
          {Object.keys(traceStats.agents).length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Agent performance</div>
              <div className="grid gap-2 md:grid-cols-3">
                {Object.entries(traceStats.agents).map(([name, data]) => (
                  <div key={name} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2">
                    <div>
                      <div className="text-[12px] text-foreground/90">{name}</div>
                      <div className="text-[10px] text-muted-foreground">{data.total} calls · {data.avg_ms}ms avg</div>
                    </div>
                    <div className={`text-[11px] font-mono ${data.errors > 0 ? "text-destructive" : "text-emerald"}`}>
                      {data.errors > 0 ? `${data.errors} err` : "✓"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Trace Log */}
      {traceEntries.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-[oklch(0.10_0.005_160)] font-mono text-[12px]">
          <div className="flex items-center justify-between border-b border-border bg-card/40 px-4 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-cyan-soft/70" />
              <span className="text-[11px]">omium traces · real-time</span>
            </div>
            <span className="text-[10.5px] text-muted-foreground">{traceEntries.length} spans</span>
          </div>
          <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
            {traceEntries.slice().reverse().map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                className="grid grid-cols-[80px_56px_160px_1fr_64px] items-center gap-3 px-4 py-2"
              >
                <span className="text-muted-foreground/70">{e.timestamp?.split("T")[1]?.slice(0, 8) || "—"}</span>
                <span className={"uppercase " + (lvlColor[e.status] || "text-muted-foreground")}>{e.status}</span>
                <span className="text-gold/85 truncate">{e.agent}</span>
                <span className="truncate text-foreground/85">{e.name}{e.error ? ` — ${e.error.slice(0, 60)}` : ""}</span>
                <span className="text-right text-muted-foreground/70 tabular-nums">{e.duration_ms || 0}ms</span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Monitor Console */}
      <section className="overflow-hidden rounded-2xl border border-border bg-[oklch(0.10_0.005_160)] font-mono text-[12px]">
        <div className="flex items-center justify-between border-b border-border bg-card/40 px-4 py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-destructive/70" />
            <span className="h-2 w-2 rounded-full bg-gold/70" />
            <span className="h-2 w-2 rounded-full bg-emerald/70" />
            <span className="ml-3 text-[11px]">griefsync ~ /var/log/agents.live</span>
          </div>
          <span className="text-[10.5px] text-muted-foreground">monitor logs</span>
        </div>
        <div className="divide-y divide-border/40">
          {stream.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
              No agent activity yet. Logs will appear as agents process tasks.
            </div>
          ) : (
            stream.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="grid grid-cols-[88px_56px_180px_1fr_64px] items-center gap-3 px-4 py-2"
              >
                <span className="text-muted-foreground/70">{s.t}</span>
                <span className={"uppercase " + lvlColor[s.lvl]}>{s.lvl}</span>
                <span className="text-gold/85">{s.agent}</span>
                <span className="truncate text-foreground/85">{s.msg}</span>
                <span className="text-right text-muted-foreground/70 tabular-nums">{s.ms}ms</span>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
