import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { apiGetAssets, apiUploadPdf, apiManualAsset, apiDeleteAsset } from "@/lib/api";

export const Route = createFileRoute("/dashboard/vault")({
  component: VaultPage,
});

type Asset = Record<string, unknown>;

function VaultPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [active, setActive] = useState("all");
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [polling, setPolling] = useState(false);

  const loadAssets = () => {
    apiGetAssets()
      .then((d) => setAssets(d.assets))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAssets(); }, []);

  // Listen for upload events (from header button or dropzone)
  useEffect(() => {
    function handleUploaded() {
      setPolling(true);
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        loadAssets();
        if (attempts >= 12) {
          clearInterval(interval);
          setPolling(false);
        }
      }, 5000);
      // Quick first check after 3s
      setTimeout(loadAssets, 3000);
    }

    window.addEventListener("griefsync:uploaded", handleUploaded);

    // Also check URL param for direct navigation
    const params = new URLSearchParams(window.location.search);
    if (params.get("uploaded") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      handleUploaded();
    }

    return () => window.removeEventListener("griefsync:uploaded", handleUploaded);
  }, []);

  // Build dynamic categories from real data
  const catCounts: Record<string, number> = {};
  for (const a of assets) {
    const cat = ((a.category as string) || "OTHER").toLowerCase();
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const categories = [
    { id: "all", label: "All", count: assets.length },
    ...Object.entries(catCounts).map(([id, count]) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), count })),
  ];

  const filtered = active === "all" ? assets : assets.filter((a) => ((a.category as string) || "OTHER").toLowerCase() === active);

  return (
    <div className="-mx-6 -my-10 md:-mx-10">
      {/* Polling indicator */}
      {polling && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-emerald/20 bg-emerald/5 px-6 py-2.5 text-center text-[12px] text-emerald md:px-10"
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald" />
            Extracting data from your document… This may take a few seconds.
          </span>
        </motion.div>
      )}
      <div className="relative overflow-hidden border-b border-border bg-gradient-night px-6 py-10 md:px-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(transparent 23px, oklch(0.78 0.10 75 / 0.4) 24px), linear-gradient(90deg, transparent 23px, oklch(0.78 0.10 75 / 0.4) 24px)", backgroundSize: "24px 24px" }} />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Estate vault</div>
            <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ivory md:text-5xl">
              The household <em className="italic text-gold">archive.</em>
            </h1>
            <p className="mt-3 max-w-md text-[14px] text-ivory/60">
              {assets.length} asset{assets.length !== 1 ? "s" : ""} indexed.
            </p>
          </div>
          <Dropzone onUploaded={loadAssets} />
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[220px_1fr_360px]">
        <aside className="border-r border-border bg-card/30 px-4 py-6">
          <div className="mb-3 px-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Categories</div>
          <ul className="space-y-0.5">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => { setActive(c.id); setSelected(0); }}
                  className={"flex w-full items-center justify-between rounded-md px-3 py-2 text-[13px] transition-colors " + (active === c.id ? "bg-gold/10 text-gold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                >
                  <span>{c.label}</span>
                  <span className="text-[11px] tabular-nums opacity-70">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setShowManual(!showManual)}
            className="mt-6 w-full rounded-lg border border-gold/40 bg-gold/5 py-2 text-[12.5px] text-gold transition-colors hover:bg-gold/10"
          >
            {showManual ? "Cancel" : "+ Add manually"}
          </button>
        </aside>

        <section className="px-6 py-6">
          {showManual ? (
            <ManualForm onSaved={() => { setShowManual(false); loadAssets(); }} />
          ) : loading ? (
            <div className="flex items-center justify-center py-20 text-[13px] text-muted-foreground">Loading assets…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-[14px] text-muted-foreground">No assets yet. Upload a PDF or add one manually.</div>
            </div>
          ) : (
            <>
              <div className="mb-4 font-display text-2xl font-light">Assets</div>
              <div className="overflow-hidden rounded-xl border border-border bg-card/40">
                <div className="grid grid-cols-[1fr_100px_120px_100px_100px] border-b border-border bg-muted/30 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Label</span><span>Category</span><span>Nominee</span><span>Sum assured</span><span>Status</span>
                </div>
                <div>
                  {filtered.map((a, i) => {
                    const warnings: string[] = Array.isArray(a.warnings) ? (a.warnings as string[]) : [];
                    return (
                      <motion.button
                        key={a.id as number ?? i}
                        onClick={() => setSelected(i)}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.04 }}
                        className={"grid w-full grid-cols-[1fr_100px_120px_100px_100px] items-center border-b border-border/60 px-4 py-3 text-left text-[13px] transition-colors last:border-0 " + (selected === i ? "bg-gold/8 text-foreground" : "text-foreground/85 hover:bg-muted/30")}
                      >
                        <span className="flex items-center gap-3 truncate">
                          <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald/15 text-[10px] text-emerald">{((a.category as string) || "?")[0]}</span>
                          <span className="truncate">{(a.label as string) || "Untitled"}</span>
                        </span>
                        <span className="text-muted-foreground text-[12px]">{(a.category as string) || "—"}</span>
                        <span className="text-muted-foreground text-[12px] truncate">{(a.nominee as string) || <span className="text-destructive/70">None</span>}</span>
                        <span className="text-muted-foreground text-[12px]">{a.sum_assured ? `₹${Number(a.sum_assured).toLocaleString("en-IN")}` : "—"}</span>
                        <span>
                          {warnings.length > 0 ? <Tag color="gold">{warnings.length} warn</Tag> : !(a.nominee as string) ? <Tag color="destructive">No nominee</Tag> : <Tag color="emerald">OK</Tag>}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="border-l border-border bg-card/30 px-5 py-6">
          {filtered[selected] ? <Inspector asset={filtered[selected]} onDeleted={loadAssets} /> : <div className="text-[13px] text-muted-foreground">Select an asset to inspect.</div>}
        </aside>
      </div>
    </div>
  );
}

function Dropzone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setMsg("");
    try {
      const res = await apiUploadPdf(file);
      setMsg(res.message || "Queued for extraction");
      setUploading(false);
      // Trigger the shared polling mechanism
      window.dispatchEvent(new CustomEvent("griefsync:uploaded"));
      setMsg("Extracting fields from PDF…");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={() => inputRef.current?.click()}
      className="group relative flex w-[320px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gold/40 bg-gold/5 px-6 py-5 text-center transition-colors hover:border-gold/70 hover:bg-gold/10"
    >
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <div className="relative">
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-gold/40 text-gold">
          {uploading ? "…" : "↑"}
        </div>
        <div className="mt-3 font-display text-[16px] text-ivory">
          {uploading ? "Uploading…" : "Drop PDF to ingest"}
        </div>
        <div className="mt-1 text-[11.5px] text-ivory/55">{msg || "PDF documents up to 50 MB"}</div>
      </div>
    </motion.div>
  );
}

function ManualForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ asset_type: "", insurer_name: "", policy_number: "", nominee_name: "", nominee_relation: "", sum_assured: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiManualAsset(form);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    }
    setSaving(false);
  }

  const field = (label: string, key: keyof typeof form) => (
    <div key={key}>
      <label className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      <input
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none focus:border-ring"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-md py-4">
      <div className="font-display text-2xl font-light mb-6">Add asset manually</div>
      {error && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {field("Category (e.g. Insurance, Property)", "asset_type")}
        {field("Label / Insurer name", "insurer_name")}
        {field("Policy number", "policy_number")}
        {field("Nominee name", "nominee_name")}
        {field("Nominee relation", "nominee_relation")}
        {field("Sum assured", "sum_assured")}
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-primary py-2.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50">
          {saving ? "Saving…" : "Save asset"}
        </button>
      </form>
    </div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald/15 text-emerald",
    cyan: "bg-cyan-soft/15 text-cyan-soft",
    gold: "bg-gold/15 text-gold",
    destructive: "bg-destructive/15 text-destructive",
  };
  return <span className={"rounded-full px-2 py-0.5 text-[10.5px] uppercase tracking-[0.16em] " + map[color]}>{children}</span>;
}

function Inspector({ asset, onDeleted }: { asset: Asset; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editForm, setEditForm] = useState({
    label: (asset.label as string) || "",
    nominee: (asset.nominee as string) || "",
    nominee_relation: (asset.nominee_relation as string) || "",
    sum_assured: asset.sum_assured != null ? String(asset.sum_assured) : "",
  });

  // Reset form when asset changes
  useEffect(() => {
    setEditing(false);
    setSaveMsg("");
    setConfirmDelete(false);
    setEditForm({
      label: (asset.label as string) || "",
      nominee: (asset.nominee as string) || "",
      nominee_relation: (asset.nominee_relation as string) || "",
      sum_assured: asset.sum_assured != null ? String(asset.sum_assured) : "",
    });
  }, [asset]);

  async function handleDelete() {
    const id = asset.id as number;
    if (!id) return;
    setDeleting(true);
    try {
      await apiDeleteAsset(id);
      onDeleted();
    } catch {
      setSaveMsg("Delete failed");
    }
    setDeleting(false);
    setConfirmDelete(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      await apiManualAsset({
        asset_type: (asset.category as string) || "",
        insurer_name: editForm.label,
        policy_number: (asset.policy_number as string) || "",
        nominee_name: editForm.nominee,
        nominee_relation: editForm.nominee_relation,
        sum_assured: editForm.sum_assured,
      });
      setSaveMsg("Saved successfully ✓");
      setEditing(false);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    }
    setSaving(false);
  }

  const raw: Record<string, unknown> = (() => { try { return JSON.parse((asset.raw_json as string) || "{}"); } catch { return {}; } })();
  // Backend returns parsed warnings array; fall back to parsing warnings_json
  const warnings: string[] = Array.isArray(asset.warnings)
    ? (asset.warnings as string[])
    : (() => { try { return JSON.parse((asset.warnings_json as string) || "[]"); } catch { return []; } })();

  const displayFields: [string, string][] = [
    ["category", (asset.category as string) || "—"],
    ["label", (asset.label as string) || "—"],
    ["policy_number", (asset.policy_number as string) || "—"],
    ["nominee", (asset.nominee as string) || "—"],
    ["nominee_relation", (asset.nominee_relation as string) || "—"],
    ["sum_assured", asset.sum_assured != null ? `₹${Number(asset.sum_assured).toLocaleString("en-IN")}` : "—"],
    ["expiry_date", (asset.expiry_date as string) || "—"],
    ["created_at", asset.created_at ? new Date(asset.created_at as string).toLocaleDateString() : "—"],
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Asset details</div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
          >
            Edit
          </button>
        )}
      </div>
      <div className="mt-3 truncate font-display text-[18px]">{(asset.label as string) || "Untitled"}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{(asset.category as string) || "Unknown category"}</div>

      {saveMsg && (
        <div className={`mt-3 rounded-md px-2.5 py-1.5 text-[12px] ${saveMsg.includes("✓") ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"}`}>
          {saveMsg}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="mt-4 space-y-3 rounded-lg border border-gold/30 bg-gold/5 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold">Edit metadata</div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Label</label>
            <input
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-ring"
              value={editForm.label}
              onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Nominee</label>
            <input
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-ring"
              value={editForm.nominee}
              onChange={(e) => setEditForm({ ...editForm, nominee: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Nominee relation</label>
            <input
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-ring"
              value={editForm.nominee_relation}
              onChange={(e) => setEditForm({ ...editForm, nominee_relation: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Sum assured</label>
            <input
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12px] outline-none focus:border-ring"
              value={editForm.sum_assured}
              onChange={(e) => setEditForm({ ...editForm, sum_assured: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-gold px-3 py-1.5 text-[11px] font-medium text-background transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Nominee highlight */}
      {!editing && (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Nominee</div>
          <div className="mt-1 text-[14px] text-foreground/90">
            {(asset.nominee as string) || <span className="text-destructive">Not assigned</span>}
          </div>
          {(asset.nominee_relation as string) && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">Relation: {asset.nominee_relation as string}</div>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold">⚠ Warnings ({warnings.length})</div>
          {warnings.map((w, i) => (
            <div key={i} className="rounded-md bg-gold/10 px-2.5 py-1.5 text-[12px] text-gold">{w}</div>
          ))}
        </div>
      )}

      <div className="mt-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">All fields</div>
      <div className="mt-2 space-y-1.5">
        {displayFields.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-[12px]">
            <span className="font-mono text-[10.5px] text-muted-foreground">{k}</span>
            <span className="text-right text-foreground/90 max-w-[180px] truncate">{v}</span>
          </div>
        ))}
      </div>

      {Object.keys(raw).length > 0 && (
        <>
          <div className="mt-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">AI-extracted data</div>
          <div className="mt-2 space-y-1.5">
            {Object.entries(raw).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1.5 text-[12px]">
                <span className="font-mono text-[10.5px] text-muted-foreground">{k}</span>
                <span className="max-w-[180px] truncate text-right text-foreground/90">{v != null ? String(v) : "—"}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete asset */}
      <div className="mt-6 border-t border-border pt-4">
        {confirmDelete ? (
          <div className="space-y-2">
            <div className="text-[12px] text-destructive">Delete this asset permanently?</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[11px] text-muted-foreground transition-colors hover:text-destructive"
          >
            Delete asset
          </button>
        )}
      </div>
    </div>
  );
}
