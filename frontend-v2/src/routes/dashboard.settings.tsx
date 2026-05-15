import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { apiGetAssets } from "@/lib/api";

export const Route = createFileRoute("/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  function handleLogout() {
    logout();
    navigate({ to: "/login" as string });
  }

  async function handleExportVault() {
    setExporting(true);
    setExportMsg("");
    try {
      const data = await apiGetAssets();
      const blob = new Blob([JSON.stringify(data.assets, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "griefsync-vault-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg("Vault exported successfully");
    } catch {
      setExportMsg("Export failed. Please try again.");
    }
    setExporting(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Account</div>
        <h1 className="mt-3 font-display text-4xl font-light tracking-tight">Settings</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Manage your profile, security, and preferences.
        </p>
      </motion.div>

      {/* Profile */}
      <Section title="Profile" delay={0.1}>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-gold text-sm font-medium text-forest-deep">
            {user ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
          </div>
          <div>
            <div className="text-[15px] text-foreground">{user?.name || "Guest"}</div>
            <div className="text-[13px] text-muted-foreground">{user?.email || "—"}</div>
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" delay={0.15}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-foreground">Password</div>
              <div className="text-[12px] text-muted-foreground">Change your account password</div>
            </div>
            <button className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
              Change password
            </button>
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-foreground">Sign out</div>
                <div className="text-[12px] text-muted-foreground">End your current session</div>
              </div>
              {showLogoutConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground">Are you sure?</span>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg bg-destructive/10 px-3 py-1.5 text-[12px] text-destructive transition-colors hover:bg-destructive/20"
                  >
                    Yes, sign out
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Continuity Preferences */}
      <Section title="Continuity Preferences" delay={0.2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-foreground">Check-in interval</div>
              <div className="text-[12px] text-muted-foreground">How often you need to check in</div>
            </div>
            <div className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground">
              Every 30 days
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-foreground">Escalation protocol</div>
                <div className="text-[12px] text-muted-foreground">
                  After missed check-ins, trusted contacts are notified in stages
                </div>
              </div>
              <div className="rounded-lg border border-emerald/30 bg-emerald/10 px-3 py-1.5 text-[12px] text-emerald">
                Active
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" delay={0.25}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-foreground">Email notifications</div>
              <div className="text-[12px] text-muted-foreground">Receive check-in reminders via email</div>
            </div>
            <Toggle enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-foreground">SMS notifications</div>
                <div className="text-[12px] text-muted-foreground">Receive urgent alerts via SMS</div>
              </div>
              <Toggle enabled={smsNotifs} onToggle={() => setSmsNotifs(!smsNotifs)} />
            </div>
          </div>
        </div>
      </Section>

      {/* Data & Privacy */}
      <Section title="Data & Privacy" delay={0.3}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-foreground">Export vault data</div>
              <div className="text-[12px] text-muted-foreground">Download all your assets as JSON</div>
            </div>
            <div className="flex items-center gap-2">
              {exportMsg && (
                <span className="text-[11px] text-emerald">{exportMsg}</span>
              )}
              <button
                onClick={handleExportVault}
                disabled={exporting}
                className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {exporting ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-foreground">Delete account</div>
                <div className="text-[12px] text-muted-foreground">
                  Permanently delete your account and all data
                </div>
              </div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-destructive">This cannot be undone</span>
                  <button className="rounded-lg bg-destructive/10 px-3 py-1.5 text-[12px] text-destructive transition-colors hover:bg-destructive/20">
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-[12px] text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete account
                </button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Session */}
      <Section title="Session" delay={0.35}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] text-foreground">Current session</div>
              <div className="text-[12px] text-muted-foreground">
                Logged in as {user?.email || "—"}
              </div>
            </div>
            <div className="rounded-lg border border-emerald/30 bg-emerald/10 px-3 py-1.5 text-[12px] text-emerald">
              Active
            </div>
          </div>
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-foreground">Sign out all devices</div>
                <div className="text-[12px] text-muted-foreground">
                  End all sessions across all devices
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out all
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Prominent sign out button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="pb-10"
      >
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-destructive/30 bg-destructive/5 py-3.5 text-[14px] font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}

function Section({ title, delay = 0, children }: { title: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-md"
    >
      <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{title}</div>
      {children}
    </motion.section>
  );
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={
        "relative h-6 w-11 rounded-full transition-colors " +
        (enabled ? "bg-emerald" : "bg-muted")
      }
    >
      <motion.span
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}
