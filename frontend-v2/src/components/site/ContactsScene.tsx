import { motion } from "framer-motion";
import { useState } from "react";

type Person = {
  id: string;
  name: string;
  role: string;
  initials: string;
  tier: "primary" | "secondary" | "tertiary";
  x: number;
  y: number;
  desc: string;
};

const PEOPLE: Person[] = [
  { id: "spouse", name: "Sunita", role: "Spouse", initials: "SB", tier: "primary", x: 50, y: 8, desc: "First to know. Full vault access." },
  { id: "child", name: "Anaya", role: "Daughter", initials: "AB", tier: "primary", x: 85, y: 25, desc: "Protected beneficiary. Education secured." },
  { id: "exec", name: "P. Sharma", role: "Executor", initials: "PS", tier: "secondary", x: 92, y: 60, desc: "Primary estate execution authority." },
  { id: "trustee", name: "R. Iyer", role: "Trustee", initials: "RI", tier: "secondary", x: 72, y: 88, desc: "Financial stewardship and oversight." },
  { id: "cfo", name: "A. Rao", role: "Advisor", initials: "AR", tier: "secondary", x: 28, y: 88, desc: "Investment continuity management." },
  { id: "doctor", name: "Dr. Mehra", role: "Physician", initials: "DM", tier: "tertiary", x: 8, y: 60, desc: "Medical records and directives." },
  { id: "lawyer", name: "Estate counsel", role: "Legal", initials: "EC", tier: "tertiary", x: 15, y: 25, desc: "Legal continuity and compliance." },
  { id: "ins", name: "Insurance", role: "Provider", initials: "IN", tier: "tertiary", x: 50, y: 95, desc: "Policy claims and settlements." },
];

const CENTER = { x: 50, y: 50 };

const TIERS = [
  {
    badge: "Inner circle",
    window: "0–6h",
    title: "Family is told first.",
    desc: "Spouse and immediate family are notified privately, with the context they need and nothing they don't.",
    tone: "gold" as const,
  },
  {
    badge: "Trusted stewards",
    window: "6–24h",
    title: "Stewards take the wheel.",
    desc: "Executor, trustee and financial advisor receive the dossier required to act on your behalf.",
    tone: "emerald" as const,
  },
  {
    badge: "Distant systems",
    window: "24–72h",
    title: "Institutions align quietly.",
    desc: "Legal counsel, physicians and insurance providers are looped in through encrypted handoffs.",
    tone: "soft" as const,
  },
] as const;

function NetworkVisual() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative w-full max-w-[380px] mx-auto" style={{ aspectRatio: "1/1" }}>
      {/* Atmospheric background */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 50%, oklch(0.97 0.012 75 / 0.9), oklch(0.95 0.008 90) 70%)",
          }}
        />
      </div>

      {/* Single orbit ring */}
      <div className="absolute inset-[12%] rounded-full border border-forest-deep/[0.08]" />

      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
        {PEOPLE.map((p) => {
          const isActive = hovered === p.id || hovered === null;
          const opacity = hovered === null ? (p.tier === "primary" ? 0.3 : p.tier === "secondary" ? 0.15 : 0.08) : (hovered === p.id ? 0.5 : 0.05);
          const color = p.tier === "primary" ? "oklch(0.78 0.10 75)" : "oklch(0.46 0.09 158)";
          // Curved path from center to node
          const mx = (CENTER.x + p.x) / 2 + (p.y > 50 ? 3 : -3);
          const my = (CENTER.y + p.y) / 2 + (p.x > 50 ? -3 : 3);
          return (
            <motion.path
              key={`conn-${p.id}`}
              d={`M ${CENTER.x} ${CENTER.y} Q ${mx} ${my} ${p.x} ${p.y}`}
              stroke={color}
              strokeWidth={p.tier === "primary" ? 0.4 : 0.25}
              strokeOpacity={opacity}
              strokeLinecap="round"
              animate={{ strokeOpacity: opacity }}
              transition={{ duration: 0.4 }}
            />
          );
        })}
        {/* Pulse signal — travels from center outward occasionally */}
        {PEOPLE.filter(p => p.tier === "primary").map((p, i) => {
          const mx = (CENTER.x + p.x) / 2 + (p.y > 50 ? 3 : -3);
          const my = (CENTER.y + p.y) / 2 + (p.x > 50 ? -3 : 3);
          return (
            <motion.circle
              key={`pulse-${p.id}`}
              r="0.8"
              fill="oklch(0.78 0.10 75)"
              opacity="0"
              animate={{
                offsetDistance: ["0%", "100%"],
                opacity: [0, 0.7, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 4 + 2, ease: "easeInOut" }}
              style={{ offsetPath: `path("M ${CENTER.x} ${CENTER.y} Q ${mx} ${my} ${p.x} ${p.y}")` }}
            />
          );
        })}
      </svg>

      {/* Center — YOU */}
      <div className="absolute" style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%`, transform: "translate(-50%, -50%)" }}>
        <motion.div
          className="relative"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Outer glow */}
          <span className="absolute -inset-3 rounded-full bg-gold/20 blur-md" />
          {/* Ring */}
          <motion.span
            className="absolute -inset-1.5 rounded-full border border-gold/25"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          {/* Core */}
          <span
            className="relative grid h-12 w-12 place-items-center rounded-full"
            style={{
              background: "linear-gradient(145deg, oklch(0.84 0.10 75), oklch(0.65 0.09 55))",
              boxShadow: "0 6px 20px -6px oklch(0.55 0.08 50 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.3)",
            }}
          >
            <span className="font-display text-[10px] uppercase tracking-[0.2em] text-forest-deep/90">You</span>
          </span>
        </motion.div>
      </div>

      {/* People nodes */}
      {PEOPLE.map((p, i) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setHovered(p.id)}
          onMouseLeave={() => setHovered(null)}
        >
          <PersonNode person={p} isHovered={hovered === p.id} />
        </motion.div>
      ))}

      {/* Hover tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl border border-forest-deep/10 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md"
        >
          <div className="text-[12px] font-medium text-forest-deep">{PEOPLE.find(p => p.id === hovered)?.name}</div>
          <div className="text-[11px] text-forest/55">{PEOPLE.find(p => p.id === hovered)?.desc}</div>
        </motion.div>
      )}
    </div>
  );
}

function PersonNode({ person, isHovered }: { person: Person; isHovered: boolean }) {
  const size = person.tier === "primary" ? "h-10 w-10" : person.tier === "secondary" ? "h-9 w-9" : "h-8 w-8";
  const textSize = person.tier === "primary" ? "text-[10px]" : person.tier === "secondary" ? "text-[9px]" : "text-[8px]";
  const labelSize = person.tier === "primary" ? "text-[10px]" : "text-[9px]";

  const borderColor = person.tier === "primary"
    ? "border-gold/50 shadow-[0_4px_16px_-4px_oklch(0.78_0.10_75/0.3)]"
    : person.tier === "secondary"
      ? "border-emerald/30 shadow-[0_4px_12px_-4px_oklch(0.46_0.09_158/0.15)]"
      : "border-forest-deep/10 shadow-sm";

  const bgStyle = person.tier === "primary"
    ? "bg-gradient-to-br from-white to-gold/5"
    : "bg-white/90";

  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer">
      <motion.div
        className="relative"
        animate={isHovered ? { scale: 1.12 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {/* Hover glow */}
        {isHovered && (
          <motion.span
            className="absolute -inset-2 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: person.tier === "primary" ? "radial-gradient(circle, oklch(0.78 0.10 75 / 0.2), transparent 70%)" : "radial-gradient(circle, oklch(0.46 0.09 158 / 0.12), transparent 70%)" }}
          />
        )}
        <span className={`relative grid ${size} place-items-center rounded-full border ${borderColor} ${bgStyle} backdrop-blur-sm`}>
          <span className={`${textSize} font-medium tracking-wide ${person.tier === "primary" ? "text-forest-deep" : person.tier === "secondary" ? "text-emerald" : "text-forest/60"}`}>
            {person.initials}
          </span>
        </span>
      </motion.div>
      <div className="flex flex-col items-center">
        <span className={`${labelSize} font-medium text-forest-deep/85 whitespace-nowrap`}>{person.name}</span>
        {person.tier !== "tertiary" && (
          <span className="text-[8px] uppercase tracking-[0.2em] text-forest/40">{person.role}</span>
        )}
      </div>
    </div>
  );
}

function TierCard({ tier, index }: { tier: (typeof TIERS)[number]; index: number }) {
  const dot = tier.tone === "gold" ? "bg-gold" : tier.tone === "emerald" ? "bg-emerald" : "bg-emerald/50";

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, delay: 0.15 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-forest-deep/8 bg-white/75 p-5 shadow-soft backdrop-blur-xl transition-all hover:border-forest-deep/15 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className="text-[10px] uppercase tracking-[0.28em] text-forest/55">{tier.badge}</span>
        </div>
        <span className="rounded-full border border-forest-deep/10 bg-ivory/60 px-2 py-0.5 text-[10px] font-medium tabular-nums tracking-wider text-forest/65">
          {tier.window}
        </span>
      </div>
      <div className="mt-3 font-display text-[20px] font-light leading-snug text-forest-deep">{tier.title}</div>
      <p className="mt-2 text-[13px] leading-relaxed text-forest/65">{tier.desc}</p>
    </motion.div>
  );
}

export function ContactsScene() {
  return (
    <section id="contacts" className="relative overflow-hidden bg-background py-32 text-forest-deep md:py-40">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 20% 0%, oklch(0.46 0.09 158 / 0.04), transparent 55%), radial-gradient(ellipse at 85% 100%, oklch(0.78 0.10 75 / 0.05), transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-emerald"
        >
          <span className="h-px w-10 bg-emerald/40" />
          Continuity orchestration
        </motion.div>

        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          {/* LEFT — Network visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <NetworkVisual />
          </motion.div>

          {/* RIGHT — Typography + escalation cards */}
          <div className="relative">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl font-light leading-[1.05] tracking-tight text-forest-deep md:text-5xl lg:text-6xl"
            >
              The trusted circle that
              <br />
              moves <em className="italic text-emerald">in concert</em> with you.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-md text-[15.5px] leading-relaxed text-forest/65"
            >
              Family. Stewards. Institutions. Each orbit knows precisely what to do — and when —
              so continuity unfolds quietly, in the right order, around the people closest to you.
            </motion.p>

            <div className="mt-10 flex flex-col gap-3">
              {TIERS.map((tier, i) => (
                <TierCard key={tier.badge} tier={tier} index={i} />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.6 }}
              className="mt-10 flex items-center gap-3 text-[12px] text-forest/55"
            >
              <span className="h-px w-8 bg-forest-deep/15" />
              <span className="italic">Built around relationships, not paperwork.</span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
