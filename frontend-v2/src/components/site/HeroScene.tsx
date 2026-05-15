import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { MemoryNetwork } from "@/components/three/MemoryNetwork";

export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yText = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scaleNet = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  return (
    <section ref={ref} className="relative h-[160vh] bg-[#0a1a13]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div style={{ scale: scaleNet }} className="absolute inset-0">
          <MemoryNetwork className="absolute inset-0" />
        </motion.div>

        {/* atmospheric color wash */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 20%, rgba(63,163,122,0.28), transparent 55%), radial-gradient(ellipse at 85% 30%, rgba(123,198,217,0.22), transparent 55%), radial-gradient(ellipse at 50% 95%, rgba(212,163,115,0.20), transparent 60%)",
          }}
        />
        {/* gentle vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(8,22,15,0.55) 95%)",
          }}
        />
        {/* top fade */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0a1a13] to-transparent" />
        {/* bottom fade staying within dark palette */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#0a1a13] to-transparent" />

        <motion.div
          style={{ y: yText, opacity }}
          className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-ivory"
        >
          <Reveal delay={0.1}>
            <span className="inline-flex items-center gap-2 rounded-full border border-ivory/15 bg-ivory/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ivory/70">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
              </span>
              Quietly active · Estate continuity AI
            </span>
          </Reveal>

          <h1 className="mt-8 font-display text-balance text-5xl font-light leading-[1.02] tracking-tight md:text-7xl lg:text-[88px]">
            <Word delay={0.2}>Estate</Word>{" "}
            <Word delay={0.3}>continuity</Word>{" "}
            <span className="block">
              <Word delay={0.45}>for</Word>{" "}
              <Word delay={0.55}>
                <em className="font-display italic text-gold/90">modern</em>
              </Word>{" "}
              <Word delay={0.65}>families.</Word>
            </span>
          </h1>

          <Reveal delay={0.9}>
            <p className="mt-7 max-w-xl text-pretty text-base text-ivory/65 md:text-[17px]">
              Autonomous AI that organizes documents, maps nominees, and quietly monitors
              your family's continuity — long before chaos arrives.
            </p>
          </Reveal>

          <Reveal delay={1.05}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#story"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-ivory px-6 py-3 text-[14px] font-medium text-forest-deep shadow-elevated transition-transform hover:-translate-y-0.5"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-gold opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
                <span className="relative">Get started</span>
                <span aria-hidden className="relative">→</span>
              </a>
              <a
                href="#vault"
                className="inline-flex items-center gap-2 rounded-full border border-ivory/20 bg-ivory/5 px-6 py-3 text-[14px] text-ivory backdrop-blur-md transition-colors hover:border-ivory/40 hover:bg-ivory/10"
              >
                View platform
              </a>
            </div>
          </Reveal>

          <Reveal delay={1.4}>
            <div className="mt-20 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-ivory/40">
              <span className="h-px w-10 bg-ivory/20" />
              Scroll to enter
              <span className="h-px w-10 bg-ivory/20" />
            </div>
          </Reveal>
        </motion.div>
      </div>
    </section>
  );
}

function Word({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <motion.span
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </span>
  );
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
