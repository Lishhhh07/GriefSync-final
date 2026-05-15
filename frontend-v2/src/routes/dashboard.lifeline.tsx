import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { apiGetLifelineStatus, apiCheckin, apiSaveContacts, apiGetContacts } from "@/lib/api";

export const Route = createFileRoute("/dashboard/lifeline")({
  component: LifelinePage,
});

function LifelinePage() {
  const [status, setStatus] = useState<{
    current_day: number; days_overdue: number; days_since_checkin: number;
    next_action: string; trusted_contacts: number;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  // Contacts form state
  const [contacts, setContacts] = useState([{ name: "", email: "", phone: "" }]);
  const [existingContacts, setExistingContacts] = useState<Array<{ id: number; name: string; email: string; phone?: string; confirmed?: boolean }>>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    apiGetLifelineStatus()
      .then(setStatus)
      .catch(() => {});
    apiGetContacts()
      .then((res) => setExistingContacts(res.contacts))
      .catch(() => {});
  }, [checkedIn]);

  async function handleCheckin() {
    setChecking(true);
    try {
      await apiCheckin();
      setCheckedIn(true);
    } catch { /* ignore */ }
    setChecking(false);
  }

  async function handleSaveContacts(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const valid = contacts.filter((c) => c.name && c.email);
      const res = await apiSaveContacts(valid);
      setSaveMsg(`Saved ${res.count} contact(s)`);
      // Refresh contacts list and status
      const updated = await apiGetContacts();
      setExistingContacts(updated.contacts);
      setContacts([{ name: "", email: "", phone: "" }]);
      apiGetLifelineStatus().then(setStatus).catch(() => {});
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "Failed");
    }
    setSaving(false);
  }

  return (
    <div className="-mx-6 -my-10 md:-mx-10">
      <div className="relative overflow-hidden bg-gradient-night px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-emerald">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald" /><span className="relative h-1.5 w-1.5 rounded-full bg-emerald" /></span>
              Lifeline · operational
            </div>
            <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-ivory md:text-5xl">
              We are <em className="italic text-gold">listening, quietly.</em>
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["Days since check-in", status ? `${status.days_since_checkin}d` : "—"],
              ["Next action", status?.next_action || "—"],
              ["Trusted contacts", status ? `${status.trusted_contacts}` : "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-ivory/10 bg-ivory/5 px-4 py-2.5">
                <div className="font-display text-xl text-ivory">{v}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-ivory/55">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
        {/* Lifeline status */}
        <section className="relative flex min-h-[560px] items-center justify-center overflow-hidden bg-gradient-night px-6 py-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-emerald-glow opacity-60" />
          <div className="relative h-[460px] w-[460px]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="absolute inset-0 rounded-full border border-emerald/15" style={{ transform: `scale(${i / 4})` }} />
            ))}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(from 0deg, transparent 0deg, oklch(0.55 0.12 158 / 0.35) 30deg, transparent 60deg)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_30px_oklch(0.78_0.10_75/0.8)]" />
            <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/40 pulse-ring" />
            <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/40 pulse-ring" style={{ animationDelay: "0.8s" }} />
            <span className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/40 pulse-ring" style={{ animationDelay: "1.6s" }} />

            {/* Escalation stages */}
            {status && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="mt-20 space-y-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-ivory/50">Escalation day</div>
                  <div className="font-display text-5xl text-ivory">{status.current_day}</div>
                  <div className="text-[12px] text-ivory/60">{status.next_action}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right rail */}
        <aside className="border-l border-border bg-card/40 px-6 py-8">
          {/* Check-in button */}
          <button
            onClick={handleCheckin}
            disabled={checking || checkedIn}
            className="w-full rounded-xl bg-emerald/90 py-3 text-[14px] font-medium text-ivory transition-colors hover:bg-emerald disabled:opacity-50"
          >
            {checkedIn ? "Checked in ✓" : checking ? "Checking in…" : "Check In Now"}
          </button>

          {status && status.days_overdue > 0 && (
            <div className="mt-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-[12px] text-gold">
              Overdue by {status.days_overdue} day(s). Check in to reset the timer.
            </div>
          )}

          <div className="mt-7 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Cadence</div>
          <div className="mt-3 rounded-xl border border-border bg-background/40 p-4">
            {(() => {
              const interval = status ? status.days_since_checkin - status.days_overdue : 7;
              return (
                <>
                  <div className="font-display text-lg">Every {interval} day{interval !== 1 ? "s" : ""}</div>
                  <div className="mt-2 text-[12px] text-muted-foreground">If silent beyond your interval, escalation begins.</div>
                </>
              );
            })()}
            {status && (
              <>
                <div className="mt-3 grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const dayIndex = 28 - i;
                    const isCheckedIn = dayIndex > status.days_since_checkin;
                    const isToday = dayIndex === status.days_since_checkin;
                    return (
                      <span key={i} className={`h-3 rounded-sm ${isCheckedIn ? "bg-emerald/70" : isToday ? "bg-gold animate-pulse" : "bg-muted"}`} />
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>4 weeks ago</span><span>now</span></div>
              </>
            )}
          </div>

          {/* Trusted contacts form */}
          <div className="mt-7 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Trusted contacts</div>

          {/* Show existing contacts */}
          {existingContacts.length > 0 && (
            <div className="mt-3 space-y-2">
              {existingContacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                  <span className={`h-2 w-2 rounded-full ${c.confirmed ? "bg-emerald" : "bg-gold"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] text-foreground/90 truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.email}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{c.confirmed ? "Confirmed" : "Pending"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Add new contacts form */}
          <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {existingContacts.length > 0 ? "Update contacts" : "Add contacts"}
          </div>
          <form onSubmit={handleSaveContacts} className="mt-3 space-y-3">
            {contacts.map((c, i) => (
              <div key={i} className="space-y-1.5 rounded-lg border border-border bg-background/40 p-3">
                <input
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-ring"
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => { const n = [...contacts]; n[i] = { ...n[i], name: e.target.value }; setContacts(n); }}
                />
                <input
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-ring"
                  placeholder="Email"
                  type="email"
                  value={c.email}
                  onChange={(e) => { const n = [...contacts]; n[i] = { ...n[i], email: e.target.value }; setContacts(n); }}
                />
                <input
                  className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[12.5px] outline-none focus:border-ring"
                  placeholder="Phone (optional)"
                  value={c.phone}
                  onChange={(e) => { const n = [...contacts]; n[i] = { ...n[i], phone: e.target.value }; setContacts(n); }}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContacts([...contacts, { name: "", email: "", phone: "" }])}
                className="text-[12px] text-gold hover:underline"
              >
                + Add another
              </button>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-primary py-2 text-[12.5px] font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save contacts"}
            </button>
            {saveMsg && <div className="text-[12px] text-muted-foreground">{saveMsg}</div>}
          </form>
        </aside>
      </div>
    </div>
  );
}
