import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { apiGetScore, apiGetGaps, apiGetScoreHistory, apiGetAssets } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const [score, setScore] = useState<{ score: number; breakdown: Record<string, number> }>({ score: 0, breakdown: {} });
  const [gaps, setGaps] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ score: number; recorded_at: string }>>([]);
  const [assets, setAssets] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGetScore().catch(() => ({ score: 0, breakdown: {} })),
      apiGetGaps().catch(() => ({ gaps: [] })),
      apiGetScoreHistory().catch(() => ({ history: [] })),
      apiGetAssets().catch(() => ({ assets: [] })),
    ]).then(([s, g, h, a]) => {
      setScore(s);
      setGaps(g.gaps);
      setHistory(h.history);
      setAssets(a.assets);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-[13px] text-muted-foreground">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <Header />
      <ScoreAndGaps score={score} gaps={gaps} history={history} />
      <AssetBreakdown assets={assets} />
    </div>
  );
}

function Header() {
  const user = useAuthStore((s) => s.user);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Welcome{user ? `, ${user.name}` : ""}
        </div>
        <h1 className="mt-3 font-display text-4xl font-light tracking-tight md:text-5xl">
          Your household is <em className="italic text-gold">quietly protected.</em>
        </h1>
        <p className="mt-3 max-w-xl text-[14.5px] text-muted-foreground">
          Review your estate readiness below. Your lifeline check-in is automatic.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-4 py-2 text-[12.5px] text-emerald">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald" />
        </span>
        Checked in today ✓
      </div>
    </motion.div>
  );
}

function gapToRoute(gap: string): string {
  if (gap.includes("assets") || gap.includes("nominee")) return "/dashboard/vault";
  if (gap.includes("conflicts") || gap.includes("unreviewed")) return "/dashboard/nominees";
  if (gap.includes("contacts")) return "/dashboard/contacts";
  if (gap.includes("message")) return "/dashboard/legacy";
  return "/dashboard/vault";
}

function ScoreAndGaps({
  score,
  gaps,
  history,
}: {
  score: { score: number; breakdown: Record<string, number> };
  gaps: string[];
  history: Array<{ score: number; recorded_at: string }>;
}) {
  const chartData = [...history].reverse().map((h) => ({
    score: h.score,
    date: h.recorded_at?.split("T")[0],
  }));

  const breakdownItems = [
    { label: "Assets with nominees", key: "assets", color: "emerald" },
    { label: "Conflict analysis", key: "analysis", color: "gold" },
    { label: "Trusted contacts (2+)", key: "contacts", color: "cyan-soft" },
    { label: "Final message", key: "obituary", color: "muted" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Card delay={0.1}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Estate readiness
            </div>
          </div>
          <div className={`rounded-full px-2.5 py-1 text-[11px] ${score.score >= 75 ? "bg-emerald/15 text-emerald" : score.score >= 50 ? "bg-gold/15 text-gold" : "bg-destructive/15 text-destructive"}`}>
            {score.score >= 75 ? "On track" : score.score >= 50 ? "Needs attention" : "At risk"}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-8">
          <Ring value={score.score} />
          <div className="flex-1 space-y-3">
            {breakdownItems.map(({ label, key, color }) => {
              const val = score.breakdown[key] ? 100 : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground/85">{score.breakdown[key] ? "✓" : "○"}</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${val}%` }}
                      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                      className={
                        "h-full rounded-full " +
                        ({ emerald: "bg-emerald", gold: "bg-gold", "cyan-soft": "bg-cyan-soft", muted: "bg-mist" } as Record<string, string>)[color]
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {chartData.length > 1 && (
          <div className="mt-5">
            <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">30-day trend</div>
            <div style={{ width: "100%", height: 50 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    formatter={(value: number) => [`${value}`, "Score"]}
                    labelFormatter={(label: string) => label}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="score" stroke={score.score >= 75 ? "#22c55e" : score.score >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      <Card delay={0.2}>
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            What needs attention
          </div>
          <div className="text-[11px] text-muted-foreground">{gaps.length} item{gaps.length !== 1 ? "s" : ""}</div>
        </div>
        {gaps.length === 0 ? (
          <div className="mt-6 text-center text-[13px] text-muted-foreground">
            <div className="text-2xl">✓</div>
            <div className="mt-2">All clear — your estate is in good shape.</div>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-4 py-4">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-foreground/90">{gap}</div>
                </div>
                <Link
                  to={gapToRoute(gap)}
                  className="text-[12px] text-gold transition-colors hover:text-foreground"
                >
                  Fix →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AssetBreakdown({ assets }: { assets: Array<Record<string, unknown>> }) {
  const catMap: Record<string, { total: number; withNominee: number; sumAssured: number }> = {};
  for (const a of assets) {
    const cat = (a.category as string) || "OTHER";
    if (!catMap[cat]) catMap[cat] = { total: 0, withNominee: 0, sumAssured: 0 };
    catMap[cat].total++;
    if (a.nominee) catMap[cat].withNominee++;
    if (a.sum_assured) catMap[cat].sumAssured += Number(a.sum_assured) || 0;
  }
  const cats = Object.entries(catMap);
  const totalValue = cats.reduce((sum, [, c]) => sum + c.sumAssured, 0);

  if (cats.length === 0) {
    return (
      <Card delay={0.3}>
        <div className="text-center py-8">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Estate vault</div>
          <div className="text-[14px] text-muted-foreground">No assets yet. Upload a PDF or add one manually.</div>
          <Link to="/dashboard/vault" className="mt-4 inline-block text-[12.5px] text-gold hover:underline">
            Go to Vault →
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {totalValue > 0 && (
        <Card delay={0.25}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Total estate value tracked</div>
            <Link to="/dashboard/vault" className="text-[11px] text-gold hover:underline">View all →</Link>
          </div>
          <div className="mt-3 font-display text-3xl font-light">₹{totalValue.toLocaleString("en-IN")}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">Across {assets.length} asset{assets.length !== 1 ? "s" : ""}</div>
        </Card>
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cats.map(([name, c], i) => (
          <Card delay={0.05 * i} key={name}>
            <div className="flex items-center justify-between">
              <div className="text-[14px] text-foreground/90">{name}</div>
              <div className="text-[11px] text-muted-foreground">
                {c.withNominee}/{c.total} with nominee
              </div>
            </div>
            {c.sumAssured > 0 && (
              <div className="mt-2 text-[13px] text-gold">₹{c.sumAssured.toLocaleString("en-IN")}</div>
            )}
            <div className="mt-4 flex items-end gap-1.5">
              {Array.from({ length: c.total }).map((_, j) => (
                <motion.span
                  key={j}
                  initial={{ scaleY: 0.2, opacity: 0.4 }}
                  animate={{ scaleY: 1, opacity: j < c.withNominee ? 1 : 0.2 }}
                  transition={{ duration: 0.6, delay: 0.05 * j, ease: [0.16, 1, 0.3, 1] }}
                  className={
                    "block h-10 w-2 origin-bottom rounded-sm " +
                    (j < c.withNominee ? "bg-gradient-to-t from-emerald to-cyan-soft/60" : "bg-muted")
                  }
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground">
              <span>Nominee coverage</span>
              <span>{c.total > 0 ? Math.round((c.withNominee / c.total) * 100) : 0}%</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-md transition-colors hover:border-gold/30"
    >
      <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-emerald/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </motion.section>
  );
}

function Ring({ value }: { value: number }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative">
      <svg width="170" height="170" viewBox="0 0 170 170">
        <defs>
          <linearGradient id="overviewRing" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#D4A373" />
            <stop offset="100%" stopColor="#2D6A4F" />
          </linearGradient>
        </defs>
        <circle
          cx="85"
          cy="85"
          r={r}
          fill="none"
          stroke="rgba(245,245,245,0.07)"
          strokeWidth="9"
        />
        <motion.circle
          cx="85"
          cy="85"
          r={r}
          fill="none"
          stroke="url(#overviewRing)"
          strokeWidth="9"
          strokeLinecap="round"
          transform="rotate(-90 85 85)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-4xl font-light">{value}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            of 100
          </div>
        </div>
      </div>
    </div>
  );
}
