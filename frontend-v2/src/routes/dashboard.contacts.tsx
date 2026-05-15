import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { apiGetContacts, apiSaveContacts } from "@/lib/api";

export const Route = createFileRoute("/dashboard/contacts")({
  component: ContactsPage,
});

type Contact = { id: number; name: string; email: string; phone?: string; confirmed?: boolean; notified_at?: string };

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit form state
  const [showForm, setShowForm] = useState(false);
  const [formContacts, setFormContacts] = useState([{ name: "", email: "", phone: "" }]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    loadContacts();
  }, []);

  function loadContacts() {
    apiGetContacts()
      .then((res) => setContacts(res.contacts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const valid = formContacts.filter((c) => c.name && c.email);
      const res = await apiSaveContacts(valid);
      setSaveMsg(`Saved ${res.count} contact(s)`);
      setShowForm(false);
      setFormContacts([{ name: "", email: "", phone: "" }]);
      loadContacts();
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-muted-foreground">Loading contacts…</div>;
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-border p-8 md:p-10" style={{ background: "linear-gradient(135deg, oklch(0.22 0.018 60) 0%, oklch(0.18 0.014 80) 60%, oklch(0.20 0.022 30) 100%)" }}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-gold">The people who carry it forward</div>
            <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ivory md:text-5xl">
              {contacts.length > 0
                ? <>{contacts.length} trusted contact{contacts.length !== 1 ? "s" : ""} <em className="italic text-gold">standing by.</em></>
                : <>No contacts yet. <em className="italic text-gold">Add them in Lifeline.</em></>}
            </h1>
            <p className="mt-3 max-w-md text-[14px] text-ivory/65">
              Each contact sees only what their role requires. Trust is layered, never absolute.
            </p>
          </div>
          {contacts.length > 0 && (
            <div className="flex -space-x-3">
              {contacts.slice(0, 5).map((c, i) => (
                <motion.span
                  key={c.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="grid h-12 w-12 place-items-center rounded-full border-2 border-background bg-gradient-gold text-[12px] font-medium text-forest-deep"
                >
                  {initials(c.name)}
                </motion.span>
              ))}
            </div>
          )}
        </div>
      </div>

      {contacts.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-border bg-card/60 p-10 text-center">
          <div className="text-[14px] text-muted-foreground">
            You haven't added any trusted contacts yet.
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-block text-[13px] text-gold hover:underline"
          >
            + Add contacts
          </button>
        </div>
      ) : (
        <>
          {/* Add/Edit form */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card/60 p-6"
            >
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Add trusted contacts</div>
              <form onSubmit={handleSave} className="space-y-3">
                {formContacts.map((c, i) => (
                  <div key={i} className="grid gap-2 rounded-lg border border-border bg-background/40 p-3 md:grid-cols-3">
                    <input
                      className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-[13px] outline-none focus:border-ring"
                      placeholder="Name"
                      value={c.name}
                      onChange={(e) => { const n = [...formContacts]; n[i] = { ...n[i], name: e.target.value }; setFormContacts(n); }}
                    />
                    <input
                      className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-[13px] outline-none focus:border-ring"
                      placeholder="Email"
                      type="email"
                      value={c.email}
                      onChange={(e) => { const n = [...formContacts]; n[i] = { ...n[i], email: e.target.value }; setFormContacts(n); }}
                    />
                    <input
                      className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-[13px] outline-none focus:border-ring"
                      placeholder="Phone (optional)"
                      value={c.phone}
                      onChange={(e) => { const n = [...formContacts]; n[i] = { ...n[i], phone: e.target.value }; setFormContacts(n); }}
                    />
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  {formContacts.length < 2 && (
                    <button
                      type="button"
                      onClick={() => setFormContacts([...formContacts, { name: "", email: "", phone: "" }])}
                      className="text-[12px] text-gold hover:underline"
                    >
                      + Add another
                    </button>
                  )}
                  <span className="text-[11px] text-muted-foreground">Max 2 contacts</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-[12.5px] font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save contacts"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setSaveMsg(""); }}
                    className="text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  {saveMsg && <span className="text-[12px] text-gold">{saveMsg}</span>}
                </div>
              </form>
            </motion.div>
          )}

          {/* Contact cards */}
          {contacts.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Your contacts</div>
                {!showForm && (
                  <button
                    onClick={() => {
                      setFormContacts(contacts.map((c) => ({ name: c.name, email: c.email, phone: c.phone || "" })));
                      setShowForm(true);
                    }}
                    className="text-[12px] text-gold hover:underline"
                  >
                    Edit contacts
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {contacts.map((c, i) => (
                  <motion.article
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.05 * i }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 transition-all hover:border-gold/30 hover:shadow-elevated"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-gold text-[14px] font-medium text-forest-deep">
                          {initials(c.name)}
                        </span>
                        <span className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${c.confirmed ? "bg-emerald" : "bg-gold"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14.5px] text-foreground/95">{c.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">{c.email}</div>
                        {c.phone && <div className="text-[11.5px] text-muted-foreground">{c.phone}</div>}
                      </div>
                    </div>

                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
                        <span className={`h-1 w-1 rounded-full ${c.confirmed ? "bg-emerald" : "bg-gold"}`} />
                        <span className="text-foreground/85">{c.confirmed ? "Confirmed" : "Pending confirmation"}</span>
                      </div>
                      {c.notified_at && (
                        <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-[11.5px] text-muted-foreground">
                          <span className="h-1 w-1 rounded-full bg-cyan-soft" />
                          <span className="text-foreground/85">Notified {new Date(c.notified_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <span className="pointer-events-none absolute inset-x-5 -top-px h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </motion.article>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
