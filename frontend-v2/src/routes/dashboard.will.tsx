import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { apiGetAssets, apiWillAnalyze, apiWillEdit, apiAnalyzeConflicts, apiGenerateWillPdf } from "@/lib/api";

export const Route = createFileRoute("/dashboard/will")({
  component: WillBuilderPage,
});

type Asset = Record<string, unknown>;
type Conflict = { id: string; severity: string; type: string; asset: string; description: string; legal_basis: string; recommendations: Array<{ id: string; action: string; description: string; impact: string }> };

function WillBuilderPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictSummary, setConflictSummary] = useState("");
  const [detectingConflicts, setDetectingConflicts] = useState(false);

  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const blob = await apiGenerateWillPdf(analysis);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "griefsync_will.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setDownloading(false);
  }
  const [editPrompt, setEditPrompt] = useState("");
  const [editResponse, setEditResponse] = useState("");
  const [editing, setEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<Array<{ prompt: string; response: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGetAssets()
      .then((d) => setAssets(d.assets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [editHistory]);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await apiWillAnalyze();
      setAnalysis(res.analysis);
    } catch { /* ignore */ }
    setAnalyzing(false);
  }

  async function handleDetectConflicts() {
    setDetectingConflicts(true);
    try {
      const res = await apiAnalyzeConflicts();
      setConflicts(res.conflicts || []);
      setConflictSummary(res.summary || "");
    } catch { /* ignore */ }
    setDetectingConflicts(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editPrompt.trim() || editing) return;
    const prompt = editPrompt.trim();
    setEditPrompt("");
    setEditing(true);
    try {
      const res = await apiWillEdit(prompt);
      setEditHistory((h) => [...h, { prompt, response: res.answer }]);
      setEditResponse(res.answer);
      // Update analysis with the latest edit
      if (res.answer) setAnalysis((prev) => prev + "\n\n---\n\n" + res.answer);
    } catch { /* ignore */ }
    setEditing(false);
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-[13px] text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="-mx-6 -my-10 md:-mx-10">
      {/* Header */}
      <div className="border-b border-border bg-gradient-night px-6 py-8 md:px-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Estate planning</div>
          <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ivory md:text-5xl">
            Will <em className="italic text-gold">Builder</em>
          </h1>
          <p className="mt-2 text-[14px] text-ivory/60">
            AI-assisted estate planning with conflict detection and natural language editing.
          </p>
        </motion.div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={handleAnalyze} disabled={analyzing || assets.length === 0} className="rounded-lg bg-gold px-4 py-2 text-[12.5px] font-medium text-background disabled:opacity-50">
            {analyzing ? "Analyzing…" : "Run AI Analysis"}
          </button>
          <button onClick={handleDetectConflicts} disabled={detectingConflicts || assets.length === 0} className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-[12.5px] text-gold disabled:opacity-50">
            {detectingConflicts ? "Detecting…" : "Detect Conflicts"}
          </button>
          <button onClick={handleDownloadPdf} disabled={downloading || !analysis} className="rounded-lg border border-border px-4 py-2 text-[12.5px] text-ivory/70 hover:text-ivory disabled:opacity-50">
            {downloading ? "Generating PDF…" : "↓ Download PDF"}
          </button>
        </div>
      </div>

      {/* Split pane: Document + AI Editor */}
      <div className="grid min-h-[calc(100vh-280px)] lg:grid-cols-[1fr_400px]">
        {/* Left: Will document */}
        <div className="overflow-y-auto border-r border-border px-6 py-6 md:px-10">
          {/* Conflicts */}
          {conflicts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.25em] text-destructive">
                  {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} detected
                </div>
                {conflictSummary && <div className="text-[11px] text-muted-foreground max-w-[300px] truncate">{conflictSummary}</div>}
              </div>
              <div className="space-y-3">
                {conflicts.map((c) => (
                  <ConflictCard key={c.id} conflict={c} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Assets overview */}
          <div className="mb-6">
            <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Estate assets ({assets.length})
            </div>
            <div className="space-y-1.5">
              {assets.map((a, i) => (
                <div key={(a.id as number) ?? i} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded bg-gold/10 text-[9px] text-gold">{((a.category as string) || "?")[0]}</span>
                    <span className="text-[12.5px] text-foreground/90">{(a.label as string) || "Untitled"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {(a.nominee as string) ? <span className="text-emerald/80">→ {a.nominee as string}</span> : <span className="text-destructive/70">No nominee</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analysis document */}
          {analysis ? (
            <div className="rounded-2xl border border-border bg-card/60 p-6">
              <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Will analysis & allocation</div>
              <div className="whitespace-pre-wrap text-[13px] leading-[1.8] text-foreground/85 font-serif">
                {analysis}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card/40 p-10 text-center">
              <div className="text-[14px] text-muted-foreground">Run AI Analysis to generate your will document.</div>
              <div className="mt-2 text-[12px] text-muted-foreground/70">The AI will analyze your assets, detect conflicts, and draft inheritance allocations.</div>
            </div>
          )}
        </div>

        {/* Right: AI Editor panel */}
        <aside className="flex flex-col bg-[oklch(0.12_0.008_160)] border-l border-border">
          <div className="border-b border-border/60 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald">AI Will Editor</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Edit your will using natural language</div>
          </div>

          {/* Chat history */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {editHistory.length === 0 && (
              <div className="py-8 text-center">
                <div className="text-[12px] text-muted-foreground/60">Try commands like:</div>
                <div className="mt-3 space-y-2">
                  {[
                    "Give the property equally to both children",
                    "Make my spouse the primary beneficiary",
                    "Add my brother as backup executor",
                    "Change split from 50-50 to 70-30",
                  ].map((s, i) => (
                    <button key={i} onClick={() => setEditPrompt(s)} className="block w-full rounded-lg border border-border/40 bg-muted/10 px-3 py-2 text-left text-[11.5px] text-ivory/60 transition-colors hover:border-gold/30 hover:text-ivory/80">
                      "{s}"
                    </button>
                  ))}
                </div>
              </div>
            )}
            {editHistory.map((entry, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl rounded-br-sm bg-gold/10 border border-gold/20 px-3 py-2 text-[12px] text-ivory/90">
                    {entry.prompt}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded bg-emerald/10 text-[8px] text-emerald">AI</span>
                  <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-muted/20 border border-border/40 px-3 py-2 text-[12px] leading-relaxed text-ivory/80 whitespace-pre-wrap">
                    {entry.response}
                  </div>
                </div>
              </div>
            ))}
            {editing && (
              <div className="flex items-center gap-2 py-2">
                <span className="grid h-5 w-5 place-items-center rounded bg-emerald/10 text-[8px] text-emerald">AI</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald/50" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleEditSubmit} className="border-t border-border/60 px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
              <input
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Edit your will…"
                disabled={editing}
                className="flex-1 bg-transparent text-[12.5px] text-ivory/90 placeholder:text-muted-foreground/40 outline-none disabled:opacity-50"
              />
              <button type="submit" disabled={!editPrompt.trim() || editing} className="grid h-6 w-6 place-items-center rounded bg-emerald/80 text-[10px] text-ivory disabled:opacity-30">
                →
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const [expanded, setExpanded] = useState(false);
  const sevColor = { high: "text-destructive border-destructive/30 bg-destructive/5", medium: "text-gold border-gold/30 bg-gold/5", low: "text-muted-foreground border-border bg-muted/10" };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border p-4 ${sevColor[conflict.severity as keyof typeof sevColor] || sevColor.low}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[9px] uppercase font-medium bg-current/10">{conflict.severity}</span>
            <span className="text-[11px] font-medium">{conflict.type}</span>
          </div>
          <div className="mt-1.5 text-[12.5px] leading-relaxed opacity-90">{conflict.description}</div>
          {conflict.legal_basis && <div className="mt-1 text-[10.5px] opacity-60">Legal: {conflict.legal_basis}</div>}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 text-[10px] opacity-60 hover:opacity-100">
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && conflict.recommendations.length > 0 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 border-t border-current/10 pt-3 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Recommendations</div>
          {conflict.recommendations.map((rec) => (
            <div key={rec.id} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
              <div>
                <div className="text-[11.5px] font-medium opacity-90">{rec.action}</div>
                <div className="text-[10.5px] opacity-60">{rec.description}</div>
              </div>
              <button className="rounded-md bg-emerald/10 px-2.5 py-1 text-[10px] text-emerald transition-colors hover:bg-emerald/20">
                Apply
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
