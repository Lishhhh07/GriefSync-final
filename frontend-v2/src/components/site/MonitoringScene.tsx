import { motion } from "framer-motion";

export function MonitoringScene() {
  return (
    <section
      id="monitoring"
      className="relative overflow-hidden py-32 text-ivory"
      style={{ background: "var(--gradient-night)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 70% 30%, rgba(63,163,122,0.30), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(123,198,217,0.18), transparent 55%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-[11px] uppercase tracking-[0.25em] text-cyan-soft/90">
            Lifeline monitoring
          </span>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight tracking-tight md:text-6xl">
            A quiet pulse,<br />
            <em className="italic text-gold/90">always listening.</em>
          </h2>
          <p className="mt-6 max-w-xl text-ivory/60">
            Periodic check-ins, inactivity windows, and a tiered escalation system
            ensure trusted contacts are notified — only when truly needed, never a
            moment sooner.
          </p>
          <ul className="mt-10 space-y-4 text-[14.5px]">
            {[
              ["Adaptive check-ins", "Calibrated to your routine, never intrusive."],
              ["Inactivity intelligence", "Learns normal patterns, ignores noise."],
              ["Tiered escalation", "Spouse → trustee → executor, in that order."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-4">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <div>
                  <div className="text-ivory/90">{t}</div>
                  <div className="text-ivory/50">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-square w-full"
        >
          <RadarPulse />
        </motion.div>
      </div>
    </section>
  );
}

function RadarPulse() {
  return (
    <div className="relative h-full w-full">
      {/* concentric rings */}
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className="absolute inset-0 m-auto rounded-full border border-emerald/20"
          style={{ width: `${n * 20}%`, height: `${n * 20}%` }}
        />
      ))}
      {/* pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 m-auto rounded-full border border-gold/40"
          style={{ width: 40, height: 40 }}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: [1, 7], opacity: [0.55, 0] }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 1.3,
          }}
        />
      ))}
      {/* core */}
      <motion.div
        className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-gradient-gold shadow-glow"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* orbital nodes */}
      {[
        { angle: 25, label: "Spouse", status: "active" },
        { angle: 110, label: "Trustee", status: "active" },
        { angle: 200, label: "Executor", status: "standby" },
        { angle: 305, label: "Family doctor", status: "standby" },
      ].map((n) => (
        <OrbitNode key={n.label} {...n} />
      ))}

      {/* sweep */}
      <motion.div
        className="absolute inset-0 m-auto"
        style={{
          width: "75%",
          height: "75%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(111,175,199,0.35) 30deg, transparent 60deg)",
          maskImage:
            "radial-gradient(circle, transparent 30%, black 32%, black 100%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />

      {/* heartbeat */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-ivory/10 bg-ivory/5 px-4 py-2 text-[11px] text-ivory/70 backdrop-blur-md">
        last check-in · 2h 14m ago
      </div>
    </div>
  );
}

function OrbitNode({
  angle,
  label,
  status,
}: {
  angle: number;
  label: string;
  status: string;
}) {
  const rad = (angle * Math.PI) / 180;
  const r = 42;
  const x = 50 + Math.cos(rad) * r;
  const y = 50 + Math.sin(rad) * r;
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full ${
            status === "active" ? "animate-ping bg-emerald" : "bg-mist"
          } opacity-60`}
        />
        <span
          className={`relative h-2 w-2 rounded-full ${
            status === "active" ? "bg-emerald" : "bg-mist"
          }`}
        />
      </span>
      <span className="rounded-full border border-ivory/10 bg-[#06120D]/70 px-2.5 py-1 text-[11px] text-ivory/75 backdrop-blur">
        {label}
      </span>
    </div>
  );
}
