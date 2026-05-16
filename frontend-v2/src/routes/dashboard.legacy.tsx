import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { apiGetObituary, apiDraftObituary, apiApproveObituary, apiGetContacts } from "@/lib/api";

export const Route = createFileRoute("/dashboard/legacy")({
  component: LegacyPage,
});

type Contact = { id: number; name: string; email: string };

function LegacyPage() {
  const [obituary, setObituary] = useState<{ draft: string | null; draft_approved: boolean }>({ draft: null, draft_approved: false });
  const [drafting, setDrafting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState("all");
  const [createMode, setCreateMode] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [newRecipient, setNewRecipient] = useState("");

  useEffect(() => {
    Promise.all([
      apiGetObituary().catch(() => ({ draft: null, draft_approved: false })),
      apiGetContacts().catch(() => ({ contacts: [] })),
    ]).then(([obit, c]) => {
      setObituary({ draft: obit.draft, draft_approved: obit.draft_approved });
      if (obit.draft) setEditText(obit.draft);
      setContacts(c.contacts);
      setLoading(false);
    });
  }, []);

  async function handleDraft() {
    setDrafting(true);
    setMsg("");
    try {
      await apiDraftObituary();
      const updated = await apiGetObituary();
      setObituary({ draft: updated.draft, draft_approved: updated.draft_approved });
      if (updated.draft) setEditText(updated.draft);
      setMsg("Draft generated");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
    setDrafting(false);
  }

  async function handleApprove() {
    setApproving(true);
    setMsg("");
    try {
      await apiApproveObituary();
      setObituary((prev) => ({ ...prev, draft_approved: true }));
      setEditMode(false);
      setMsg("Approved and sealed");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
    setApproving(false);
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="-mx-6 -my-10 min-h-[calc(100vh-65px)] md:-mx-10" style={{ background: "linear-gradient(180deg, oklch(0.18 0.01 70) 0%, oklch(0.15 0.008 60) 100%)" }}>
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-[700px] px-8 py-16 md:py-24"
        >
          <div className="text-[10.5px] uppercase tracking-[0.3em] text-gold/70">Final messages</div>
          <h1 className="mt-5 font-display text-4xl font-light leading-[1.15] text-ivory md:text-5xl" style={{ fontStyle: "italic" }}>
            Your last words, <em className="text-gold">held safely.</em>
          </h1>
          <p className="mt-3 text-[14px] text-ivory/50">
            These messages will be delivered to your loved ones when the time comes. Write from the heart.
          </p>

          {/* Create / Write button — always visible */}
          {!editMode && !createMode && (
            <div className="mt-6 flex items-center gap-3">
              {obituary.draft && (
                <button
                  onClick={() => { setEditMode(true); setEditText(obituary.draft || ""); }}
                  className="rounded-full border border-ivory/20 px-5 py-2.5 text-[13px] text-ivory/70 transition-all hover:border-gold/40 hover:text-ivory"
                >
                  ✎ Edit message
                </button>
              )}
              <button
                onClick={() => { setCreateMode(true); setNewMsg(""); setNewRecipient(""); }}
                className="rounded-full bg-gold/90 px-5 py-2.5 text-[13px] font-medium text-background transition-all hover:bg-gold hover:-translate-y-px"
              >
                + Create new message
              </button>
            </div>
          )}

          {/* Recipient selector */}
          {contacts.length > 0 && (
            <div className="mt-8 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ivory/40">For:</span>
              <button
                onClick={() => setSelectedRecipient("all")}
                className={`rounded-full px-3 py-1 text-[11px] transition-colors ${selectedRecipient === "all" ? "bg-gold/15 text-gold" : "text-ivory/40 hover:text-ivory/60"}`}
              >
                Everyone
              </button>
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedRecipient(c.name)}
                  className={`rounded-full px-3 py-1 text-[11px] transition-colors ${selectedRecipient === c.name ? "bg-gold/15 text-gold" : "text-ivory/40 hover:text-ivory/60"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="my-8 flex items-center gap-4">
            <span className="h-px flex-1 bg-ivory/15" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-ivory/40">
              {obituary.draft_approved ? "approved ✓" : obituary.draft ? "draft — pending review" : "not written"}
            </span>
            <span className="h-px flex-1 bg-ivory/15" />
          </div>

          {/* Create new message form */}
          {createMode && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="rounded-2xl border border-gold/20 bg-ivory/5 p-6">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gold mb-4">New message</div>
                <div className="mb-4">
                  <label className="mb-1.5 block text-[11px] uppercase tracking-[0.15em] text-ivory/50">For</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setNewRecipient("")}
                      className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${!newRecipient ? "bg-gold/20 text-gold border border-gold/30" : "border border-ivory/10 text-ivory/50 hover:text-ivory/70"}`}
                    >
                      Everyone
                    </button>
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setNewRecipient(c.name)}
                        className={`rounded-full px-3 py-1.5 text-[11px] transition-colors ${newRecipient === c.name ? "bg-gold/20 text-gold border border-gold/30" : "border border-ivory/10 text-ivory/50 hover:text-ivory/70"}`}
                      >
                        {c.name}
                      </button>
                    ))}
                    <input
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      placeholder="Or type a name…"
                      className="rounded-full border border-ivory/10 bg-transparent px-3 py-1.5 text-[11px] text-ivory/80 placeholder:text-ivory/30 outline-none focus:border-gold/30 w-40"
                    />
                  </div>
                </div>
                <textarea
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  className="w-full min-h-[200px] rounded-xl border border-ivory/10 bg-ivory/5 p-5 font-display text-[16px] leading-[1.8] text-ivory/85 outline-none focus:border-gold/30 resize-none"
                  placeholder="Write your message here…"
                />
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setCreateMode(false)}
                    className="rounded-full border border-ivory/15 px-4 py-1.5 text-[12px] text-ivory/60 hover:text-ivory"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newMsg.trim()) {
                        setObituary({ draft: newMsg, draft_approved: false });
                        setEditText(newMsg);
                        setSelectedRecipient(newRecipient || "all");
                        setCreateMode(false);
                        setMsg(`Message created for ${newRecipient || "everyone"}`);
                      }
                    }}
                    disabled={!newMsg.trim()}
                    className="rounded-full bg-gold px-4 py-1.5 text-[12px] font-medium text-background disabled:opacity-50"
                  >
                    Save message
                  </button>
                  {newRecipient && (
                    <span className="text-[11px] text-ivory/40">→ {newRecipient}</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Message editor/viewer */}
          {editMode ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[300px] rounded-xl border border-ivory/10 bg-ivory/5 p-5 font-display text-[17px] leading-[1.8] text-ivory/85 outline-none focus:border-gold/30 resize-none"
                placeholder="Write your message here…"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => { setEditMode(false); }}
                  className="rounded-full border border-ivory/15 px-4 py-1.5 text-[12px] text-ivory/60 hover:text-ivory"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setObituary({ ...obituary, draft: editText }); setEditMode(false); setMsg("Saved locally"); }}
                  className="rounded-full bg-gold px-4 py-1.5 text-[12px] text-background"
                >
                  Save draft
                </button>
              </div>
            </motion.div>
          ) : obituary.draft ? (
            <div className="space-y-6 font-display text-[18px] leading-[1.8] text-ivory/85 whitespace-pre-wrap">
              {obituary.draft}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-[14px] text-ivory/45">No message yet.</div>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handleDraft}
                  disabled={drafting}
                  className="rounded-full border border-ivory/15 px-4 py-2 text-[12px] text-ivory/60 hover:bg-ivory/5 disabled:opacity-50"
                >
                  {drafting ? "Generating…" : "Generate with AI"}
                </button>
                <button
                  onClick={() => { setEditMode(true); setEditText(""); }}
                  className="rounded-full bg-gold/90 px-4 py-2 text-[12px] font-medium text-background"
                >
                  Write your own
                </button>
              </div>
            </div>
          )}

          {/* Status message */}
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-[12px] text-gold"
              >
                {msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-12 flex items-center justify-between border-t border-ivory/10 pt-6">
            <div className="flex items-center gap-2 text-[11px] text-ivory/40">
              {obituary.draft_approved && <span className="text-emerald">✓ Sealed</span>}
              {selectedRecipient !== "all" && <span>→ {selectedRecipient}</span>}
            </div>
            <div className="flex items-center gap-3">
              {!obituary.draft && (
                <button
                  onClick={handleDraft}
                  disabled={drafting}
                  className="rounded-full border border-ivory/15 px-4 py-1.5 text-[12px] text-ivory/60 hover:bg-ivory/5 disabled:opacity-50"
                >
                  {drafting ? "Generating…" : "Generate with AI"}
                </button>
              )}
              {obituary.draft && !editMode && (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-full border border-ivory/15 px-4 py-1.5 text-[12px] text-ivory/60 hover:bg-ivory/5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDraft}
                    disabled={drafting}
                    className="rounded-full border border-ivory/15 px-4 py-1.5 text-[12px] text-ivory/60 hover:bg-ivory/5 disabled:opacity-50"
                  >
                    {drafting ? "Regenerating…" : "Regenerate"}
                  </button>
                </>
              )}
              {obituary.draft && !obituary.draft_approved && !editMode && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="rounded-full bg-gold px-4 py-1.5 text-[12px] font-medium text-background disabled:opacity-50"
                >
                  {approving ? "Approving…" : "Approve & Seal"}
                </button>
              )}
            </div>
          </div>
        </motion.article>
      </main>
    </div>
  );
}
