import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";

export function FinalScene() {
  return (
    <section id="readiness" className="relative overflow-hidden bg-ivory py-40 text-forest-deep">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(212,163,115,0.30), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(45,106,79,0.12), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-[11px] uppercase tracking-[0.3em] text-emerald/80">
            Estate readiness
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 font-display text-5xl font-light leading-[1.04] tracking-tight md:text-7xl"
        >
          Prepared families experience<br />
          <em className="italic text-emerald">less chaos</em> in difficult moments.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 max-w-xl text-pretty text-[17px] text-forest/70"
        >
          Begin with a single document. GriefSync builds the rest — quietly,
          intelligently, and entirely on your terms.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-16 grid max-w-3xl place-items-center"
        >
          <ReadinessRing value={72} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full bg-forest-deep px-7 py-3.5 text-[14.5px] font-medium text-ivory shadow-elevated transition-transform hover:-translate-y-0.5"
          >
            Begin your readiness plan
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <a
            href="#vault"
            className="inline-flex items-center gap-2 rounded-full border border-forest-deep/15 bg-transparent px-7 py-3.5 text-[14.5px] text-forest-deep/80 transition-colors hover:bg-forest-deep/5"
          >
            Talk to our team
          </a>
        </motion.div>
      </div>

      <footer className="relative mx-auto mt-32 max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-forest-deep/10 pt-8 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-aurora">
              <span className="h-2 w-2 rounded-full bg-ivory" />
            </span>
            <span className="font-display text-[15px] tracking-tight">GriefSync</span>
          </div>
          <div className="flex flex-wrap gap-6 text-[13px] text-forest-deep/60">
            <a href="#" className="hover:text-forest-deep">Security</a>
            <a href="#" className="hover:text-forest-deep">Compliance</a>
            <a href="#" className="hover:text-forest-deep">Pricing</a>
            <a href="#" className="hover:text-forest-deep">Careers</a>
            <a href="#" className="hover:text-forest-deep">Privacy</a>
          </div>
          <div className="text-[12px] text-forest-deep/50">
            © {new Date().getFullYear()} GriefSync · Quiet infrastructure.
          </div>
        </div>
      </footer>
    </section>
  );
}

function ReadinessRing({ value }: { value: number }) {
  const r = 110;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative">
      <svg width="280" height="280" viewBox="0 0 280 280">
        <defs>
          <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#D4A373" />
            <stop offset="100%" stopColor="#2D6A4F" />
          </linearGradient>
        </defs>
        <circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          stroke="rgba(18,53,36,0.08)"
          strokeWidth="14"
        />
        <motion.circle
          cx="140"
          cy="140"
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          transform="rotate(-90 140 140)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-6xl font-light tracking-tight">{value}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-forest/60">
            Estate readiness
          </div>
        </div>
      </div>
    </div>
  );
}
