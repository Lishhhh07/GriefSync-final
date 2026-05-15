import { motion } from "framer-motion";

const features = [
  {
    tag: "AI Estate Vault",
    title: "Documents read themselves.",
    body: "Drop in wills, deeds, insurance, account statements. GriefSync extracts nominees, beneficiaries, account numbers, and policy terms into a single structured estate ledger.",
    metric: "98.4%",
    metricLabel: "extraction accuracy",
  },
  {
    tag: "Nominee & Conflict Analysis",
    title: "Inheritance gaps surface early.",
    body: "Cross-references nominees across every policy and asset. Flags missing nominees, outdated heirs, and legal mismatches before they become disputes.",
    metric: "27",
    metricLabel: "conflict patterns detected",
  },
  {
    tag: "Estate Readiness Score",
    title: "One number for the whole household.",
    body: "A continuously-updated readiness score quantifies what's documented, what's stale, and exactly what to organize next.",
    metric: "0–100",
    metricLabel: "live readiness index",
  },
];

export function VaultScene() {
  return (
    <section id="vault" className="relative overflow-hidden bg-background py-32 text-forest-deep">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse at 80% 0%, rgba(212,163,115,0.18), transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(45,106,79,0.14), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20%" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <span className="text-[11px] uppercase tracking-[0.25em] text-emerald">
            Intelligence layer
          </span>
          <h2 className="mt-4 font-display text-4xl font-light leading-tight tracking-tight text-forest-deep md:text-6xl">
            The platform begins to{" "}
            <em className="italic text-emerald">organize itself.</em>
          </h2>
          <p className="mt-6 max-w-xl text-forest/65">
            Beneath the calm surface, autonomous agents read, classify, and align every
            piece of estate-relevant information your family touches.
          </p>
        </motion.div>

        <div className="mt-20 grid gap-6 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.article
              key={f.tag}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-forest-deep/10 bg-white/70 p-7 backdrop-blur-md shadow-soft transition-all hover:-translate-y-0.5 hover:border-emerald/30 hover:shadow-elevated"
            >
              <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald/15 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" />
              <div className="relative">
                <div className="text-[10px] uppercase tracking-[0.25em] text-emerald">
                  {f.tag}
                </div>
                <h3 className="mt-4 font-display text-2xl font-light leading-snug text-forest-deep">
                  {f.title}
                </h3>
                <p className="mt-4 text-[14.5px] leading-relaxed text-forest/65">
                  {f.body}
                </p>
                <div className="mt-10 flex items-end justify-between border-t border-forest-deep/10 pt-5">
                  <div>
                    <div className="font-display text-3xl text-emerald">{f.metric}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-forest/50">
                      {f.metricLabel}
                    </div>
                  </div>
                  <div className="text-forest/40 transition-transform group-hover:translate-x-1">
                    →
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
