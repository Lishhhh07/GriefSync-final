import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { apiLogin, apiRegister } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data =
        mode === "register"
          ? await apiRegister(name, email, password)
          : await apiLogin(email, password);
      login(data.token, data.user);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-dawn px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px]"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-gradient-aurora">
            <span className="h-2.5 w-2.5 rounded-full bg-ivory" />
          </div>
          <h1 className="mt-5 font-display text-3xl tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {mode === "login"
              ? "Sign in to your GriefSync dashboard"
              : "Start protecting your family's continuity"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-soft backdrop-blur-md">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
                  Full Name
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ring"
                  placeholder="Anand Bose"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
                Email
              </label>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ring"
                type="email"
                placeholder="anand@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
                Password
              </label>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-ring"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-5 text-center text-[13px] text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => { setMode("register"); setError(null); }}
                  className="font-medium text-primary hover:underline"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
