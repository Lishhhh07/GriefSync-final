import { Link, Outlet, useRouterState, useNavigate, createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { apiCheckin, apiUploadPdf } from "@/lib/api";
import { ContinuityAssistant } from "@/components/assistant";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

const nav = [
  { to: "/dashboard", label: "Overview", icon: "◈" },
  { to: "/dashboard/vault", label: "Estate Vault", icon: "▤" },
  { to: "/dashboard/nominees", label: "Nominees", icon: "⌬" },
  { to: "/dashboard/lifeline", label: "Lifeline", icon: "◉" },
  { to: "/dashboard/contacts", label: "Trusted contacts", icon: "⊛" },
  { to: "/dashboard/legacy", label: "Final messages", icon: "✎" },
  { to: "/dashboard/will", label: "Will Builder", icon: "⚖" },
  { to: "/dashboard/activity", label: "AI activity", icon: "≋" },
  { to: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

function DashboardLayout() {
  const { user, isLoading, hydrate, logout } = useAuthStore();
  const navigate = useNavigate();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [checkinToast, setCheckinToast] = useState(false);

  // Hydrate auth from localStorage on mount
  useEffect(() => { hydrate(); }, [hydrate]);

  // Force dark for dashboard
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  // Redirect to login if not authenticated (after hydration)
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login" as string });
    }
  }, [isLoading, user, navigate]);

  // Auto check-in on mount (only if user is logged in)
  useEffect(() => {
    if (!isLoading && user) {
      apiCheckin()
        .then(() => {
          setCheckinToast(true);
          setTimeout(() => setCheckinToast(false), 3000);
        })
        .catch(() => {
          // silently ignore check-in failures
        });
    }
  }, [isLoading, user]);

  const path = useRouterState({ select: (s) => s.location.pathname });

  const [uploadMsg, setUploadMsg] = useState("");

  async function handleUploadFile(file: File) {
    setUploadMsg("Uploading…");
    try {
      const res = await apiUploadPdf(file);
      setUploadMsg(res.message || "Uploaded! Extracting…");
      // Dispatch a custom event so the vault page can start polling
      window.dispatchEvent(new CustomEvent("griefsync:uploaded"));
      // Navigate to vault if not already there
      if (path !== "/dashboard/vault") {
        navigate({ to: "/dashboard/vault" });
      }
      setTimeout(() => setUploadMsg(""), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadMsg(msg);
      setTimeout(() => setUploadMsg(""), 5000);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-[13px] text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Check-in toast notification */}
      <AnimatePresence>
        {checkinToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full border border-emerald/30 bg-emerald/10 px-4 py-2 text-[13px] text-emerald backdrop-blur-md"
          >
            Checked in for today ✓
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-border bg-sidebar/60 px-5 py-6 backdrop-blur-md md:flex">
          <Link to="/" className="flex items-center gap-2.5 px-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-aurora">
              <span className="h-2 w-2 rounded-full bg-ivory" />
            </span>
            <span className="font-display text-[16px] tracking-tight">GriefSync</span>
          </Link>

          <div className="mt-2 px-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {user ? `${user.name.split(" ").pop()} household` : "Dashboard"}
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
            {nav.map((n) => {
              const active = path === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors " +
                    (active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground")
                  }
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold"
                    />
                  )}
                  <span className="w-4 text-center text-muted-foreground/70">{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-gold text-xs font-medium text-forest-deep">
                {user ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
              </div>
              <div className="min-w-0 flex-1 text-[13px]">
                <div className="truncate text-foreground">{user?.name || "Guest"}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user?.email || ""}</div>
              </div>
              <button
                onClick={() => { logout(); navigate({ to: "/login" as string }); }}
                className="rounded-md border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/70 px-6 py-4 backdrop-blur-md md:px-10">
            <div className="flex items-center gap-3 text-[13px]">
              <span className="text-muted-foreground">Platform</span>
              <span className="text-muted-foreground/40">/</span>
              <span>{nav.find((n) => n.to === path)?.label ?? "Overview"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
                ⌘K
              </button>
              <input
                ref={uploadInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadFile(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="rounded-full bg-foreground px-4 py-1.5 text-[12.5px] font-medium text-background transition-transform hover:-translate-y-px"
              >
                {uploadMsg || "+ Upload document"}
              </button>
            </div>
          </header>
          <main className="flex-1 px-6 py-10 md:px-10">
            <Outlet />
          </main>
        </div>
      </div>
      <ContinuityAssistant />
    </div>
  );
}
