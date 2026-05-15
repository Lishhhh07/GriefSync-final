import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { apiWillAnalyze, getWillPdfUrl, apiGetAssets } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/nominees")({
  component: NomineesPage,
});

type Asset = Record<string, unknown>;
type NodeT = { id: string; label: string; sub: string; x: number; y: number; kind: "owner" | "asset" | "nominee"; status?: "ok" | "warn" | "conflict" };
type EdgeT = { from: string; to: string; share: string; status: "ok" | "warn" | "conflict" };

const statusColor = { ok: "oklch(0.55 0.13 158)", warn: "oklch(0.78 0.10 75)", conflict: "oklch(0.62 0.20 25)" };

function buildGraph(assets: Asset[], ownerName: string) {
  const nodes: NodeT[] = [];
  const edges: EdgeT[] = [];
  const nomineeMap = new Map<string, { status: "ok" | "warn" | "conflict" }>();

  // Owner node
  nodes.push({ id: "owner", label: ownerName, sub: "Owner", x: 120, y: 270, kind: "owner" });

  const spacing = Math.min(120, 480 / Math.max(assets.length, 1));
  const startY = Math.max(50, 270 - (assets.length - 1) * spacing / 2);

  assets.forEach((a, i) => {
    const aid = `asset-${a.id || i}`;
    const label = (a.label as string) || (a.insurer_name as string) || (a.category as string) || "Asset";
    const sub = (a.category as string) || "";
    const y = startY + i * spacing;
    const warnings: string[] = Array.isArray(a.warnings) ? a.warnings : [];
    const hasNominee = !!(a.nominee as string);
    const assetStatus: "ok" | "warn" | "conflict" = warnings.length > 0 ? "warn" : hasNominee ? "ok" : "conflict";

    nodes.push({ id: aid, label, sub, x: 420, y, kind: "asset" });
    edges.push({ from: "owner", to: aid, share: "owner", status: assetStatus });

    if (hasNominee) {
      const nName = (a.nominee as string);
      const nKey = nName.toLowerCase().trim();
      if (!nomineeMap.has(nKey)) {
        nomineeMap.set(nKey, { status: warnings.length > 0 ? "warn" : "ok" });
      } else if (warnings.length > 0) {
        nomineeMap.set(nKey, { status: "warn" });
      }
      edges.push({ from: aid, to: `nom-${nKey}`, share: "100%", status: warnings.length > 0 ? "warn" : "ok" });
    }
  });

  // Nominee nodes
  const nomEntries = Array.from(nomineeMap.entries());
  const nomSpacing = Math.min(140, 480 / Math.max(nomEntries.length, 1));
  const nomStartY = Math.max(50, 270 - (nomEntries.length - 1) * nomSpacing / 2);
  nomEntries.forEach(([key, val], i) => {
    nodes.push({ id: `nom-${key}`, label: key.split(" ").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" "), sub: "Nominee", x: 740, y: nomStartY + i * nomSpacing, kind: "nominee", status: val.status });
  });

  return { nodes, edges };
}

function NomineesPage() {
  const user = useAuthStore((s) => s.user);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [grounded, setGrounded] = useState(false);

  useEffect(() => {
    apiGetAssets()
      .then((res) => setAssets(res.assets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { nodes, edges } = buildGraph(assets, user?.name || "You");

  const warnings = assets.flatMap((a) => {
    const w: string[] = Array.isArray(a.warnings) ? a.warnings : [];
    return w.map((msg) => ({ asset: (a.label as string) || (a.category as string) || "Asset", msg }));
  });
  const noNominee = assets.filter((a) => !(a.nominee as string));

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await apiWillAnalyze();
      setAnalysis(res.analysis);
      setGrounded(res.grounding_used);
    } catch (e: unknown) {
      setAnalysis(e instanceof Error ? e.message : "Analysis failed");
    }
    setAnalyzing(false);
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-muted-foreground">Loading assets…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald">Inheritance map</div>
          <h1 className="mt-3 font-display text-4xl font-light tracking-tight md:text-5xl">
            Who inherits <em className="italic text-gold">what.</em>
          </h1>
          <p className="mt-3 max-w-lg text-[14px] text-muted-foreground">
            {assets.length === 0
              ? "No assets uploaded yet. Add assets in the vault to see your inheritance map."
              : `Cross-referenced across ${assets.length} asset${assets.length !== 1 ? "s" : ""}. ${warnings.length + noNominee.length} issue${warnings.length + noNominee.length !== 1 ? "s" : ""} detected.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || assets.length === 0}
            className="rounded-full bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {analyzing ? "Analysing…" : "Analyse My Estate"}
          </button>
          <a
            href={getWillPdfUrl()}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border px-4 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Download Will PDF
          </a>
        </div>
      </div>

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.25em] text-gold">Conflict Analysis</div>
            {grounded && <span className="rounded-full bg-emerald/15 px-2.5 py-0.5 text-[10px] text-emerald">Grounded</span>}
          </div>
          <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/90">{analysis}</div>
        </motion.div>
      )}

      {assets.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Graph */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-2">
            <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, oklch(0.78 0.10 75 / 0.06), transparent 60%)" }} />
            <svg viewBox="0 0 900 540" className="relative w-full">
              {edges.map((e, i) => {
                const a = nodes.find((n) => n.id === e.from);
                const b = nodes.find((n) => n.id === e.to);
                if (!a || !b) return null;
                const mx = (a.x + b.x) / 2;
                return (
                  <g key={i}>
                    <motion.path
                      d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
                      stroke={statusColor[e.status]}
                      strokeWidth={hover === e.from || hover === e.to ? 2.2 : 1.2}
                      strokeOpacity={hover && hover !== e.from && hover !== e.to ? 0.18 : 0.65}
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, delay: 0.3 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <text x={mx} y={(a.y + b.y) / 2 - 6} fill="oklch(0.66 0.012 90)" fontSize="9" textAnchor="middle" letterSpacing="0.1em" className="uppercase">
                      {e.share}
                    </text>
                  </g>
                );
              })}
              {nodes.map((n, i) => (
                <motion.g
                  key={n.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={n.x - 70} y={n.y - 22} width="140" height="44" rx="10"
                    fill={n.kind === "owner" ? "oklch(0.34 0.06 155)" : n.kind === "asset" ? "oklch(0.20 0.008 160)" : "oklch(0.17 0.008 160)"}
                    stroke={n.status ? statusColor[n.status] : n.kind === "owner" ? "oklch(0.78 0.10 75 / 0.6)" : "oklch(0.26 0.008 160)"}
                    strokeWidth="1"
                  />
                  <text x={n.x} y={n.y - 4} fill="oklch(0.96 0.012 90)" fontSize="12" textAnchor="middle" fontWeight="500">{n.label}</text>
                  <text x={n.x} y={n.y + 11} fill="oklch(0.66 0.012 90)" fontSize="10" textAnchor="middle">{n.sub}</text>
                </motion.g>
              ))}
            </svg>
          </div>

          {/* Issues panel */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Detected issues</div>
            {noNominee.map((a, i) => (
              <motion.div key={`nn-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 * i }} className="rounded-xl border border-border bg-card/60 p-4" style={{ borderLeft: `3px solid ${statusColor.conflict}` }}>
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: statusColor.conflict }}>Missing nominee</div>
                <div className="mt-1 text-[13.5px] text-foreground/90">{(a.label as string) || (a.category as string) || "Asset"}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">This asset has no nominee assigned.</div>
              </motion.div>
            ))}
            {warnings.map((w, i) => (
              <motion.div key={`w-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 * (i + noNominee.length) }} className="rounded-xl border border-border bg-card/60 p-4" style={{ borderLeft: `3px solid ${statusColor.warn}` }}>
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: statusColor.warn }}>Warning</div>
                <div className="mt-1 text-[13.5px] text-foreground/90">{w.asset}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">{w.msg}</div>
              </motion.div>
            ))}
            {warnings.length === 0 && noNominee.length === 0 && (
              <div className="rounded-xl border border-border bg-card/60 p-4 text-center text-[13px] text-muted-foreground">
                No issues detected. All assets have nominees assigned.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
