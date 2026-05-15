import { motion, useScroll, useTransform, useMotionValueEvent, animate, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Cinematic document intelligence pipeline.
 * 5 stages mapped to scroll progress on a pinned section:
 *  1. Ingest    — real-looking documents float in
 *  2. Scan      — AI beam reads the primary document
 *  3. Extract   — metadata chips detach from the page
 *  4. Structure — chips assemble into the estate ledger
 *  5. Map       — nominees connect into a relationship graph
 */
export function DocumentPipelineScene() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Stage windows
  const ingest = useTransform(scrollYProgress, [0.00, 0.18], [0, 1]);
  const scan = useTransform(scrollYProgress, [0.18, 0.40], [0, 1]);
  const extract = useTransform(scrollYProgress, [0.40, 0.62], [0, 1]);
  const structure = useTransform(scrollYProgress, [0.58, 0.80], [0, 1]);
  const graph = useTransform(scrollYProgress, [0.78, 0.98], [0, 1]);

  // Active stage index for caption (0..4)
  const stageIndex = useTransform(scrollYProgress, (v): number => {
    if (v < 0.18) return 0;
    if (v < 0.40) return 1;
    if (v < 0.62) return 2;
    if (v < 0.80) return 3;
    return 4;
  });

  return (
    <section
      id="story"
      ref={ref}
      className="relative h-[520vh]"
      style={{ background: "var(--gradient-dawn)" }}
    >
      {/* soft top blend from hero */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#0a1a13] to-transparent" />

      <div className="sticky top-0 h-screen overflow-hidden">
        {/* ambient glows */}
        <div className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
             style={{ background: "radial-gradient(circle, oklch(0.85 0.10 150 / 0.55), transparent 70%)" }} />
        <div className="pointer-events-none absolute -right-32 bottom-10 h-[460px] w-[460px] rounded-full opacity-60 blur-3xl"
             style={{ background: "radial-gradient(circle, oklch(0.82 0.09 75 / 0.55), transparent 70%)" }} />

        <PipelineHeader stageIndex={stageIndex} />
        <PipelineStage
          ingest={ingest}
          scan={scan}
          extract={extract}
          structure={structure}
          graph={graph}
        />
        <ProgressRail progress={scrollYProgress} />
      </div>
    </section>
  );
}

/* --------------------------- header / captions --------------------------- */

const STAGES = [
  {
    eyebrow: "01 · Ingest",
    title: "Documents enter the system.",
    body: "Wills, insurance policies, deeds, bank statements — uploaded once, in any format.",
    hasStat: true,
  },
  {
    eyebrow: "02 · Read",
    title: "AI quietly reads each page.",
    body: "Vision and language models parse text, tables, and stamped fields with field-level confidence.",
  },
  {
    eyebrow: "03 · Extract",
    title: "Estate metadata is lifted off the page.",
    body: "Nominees, policy numbers, sums assured, custodians, maturity dates — separated from the paper.",
  },
  {
    eyebrow: "04 · Structure",
    title: "Information becomes a living ledger.",
    body: "Each fact lands in a typed, queryable record inside your private estate vault.",
  },
  {
    eyebrow: "05 · Map",
    title: "Relationships and continuity activate.",
    body: "Nominees, trustees, and contingents form one map. Conflicts and gaps surface immediately.",
  },
] as const;

function PipelineHeader({ stageIndex }: { stageIndex: MotionValue<number> }) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 px-6 pt-10 md:pt-14">
      <div className="mx-auto flex max-w-6xl flex-col items-start">
        <div className="text-[10px] uppercase tracking-[0.3em] text-emerald/80">
          The document intelligence pipeline
        </div>
        <div className="mt-3 grid w-full grid-cols-1 gap-2">
          {STAGES.map((s, i) => (
            <StageLine key={s.eyebrow} index={i} stage={s} stageIndex={stageIndex} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StageLine({
  index,
  stage,
  stageIndex,
}: {
  index: number;
  stage: (typeof STAGES)[number];
  stageIndex: MotionValue<number>;
}) {
  const opacity = useTransform(stageIndex, (v) => (Math.round(v) === index ? 1 : 0));
  const y = useTransform(stageIndex, (v) => (Math.round(v) === index ? 0 : 8));
  return (
    <motion.div
      style={{ opacity, y, gridArea: "1 / 1" }}
      className="pointer-events-none col-start-1 row-start-1"
    >
      <div className="text-[11px] uppercase tracking-[0.3em] text-forest/60">
        {stage.eyebrow}
      </div>
      <h2 className="mt-2 max-w-xl font-display text-3xl font-light leading-[1.1] tracking-tight text-forest-deep md:text-5xl">
        {stage.title}
      </h2>
      <p className="mt-3 max-w-md text-[14px] text-forest/65 md:text-[15px]">
        {stage.body}
      </p>
      {"hasStat" in stage && stage.hasStat ? (
        <UnclaimedStat stageIndex={stageIndex} index={index} />
      ) : null}
    </motion.div>
  );
}

function UnclaimedStat({
  stageIndex,
  index,
}: {
  stageIndex: MotionValue<number>;
  index: number;
}) {
  const [val, setVal] = useState(0);
  const started = useRef(false);

  const start = () => {
    if (started.current) return;
    started.current = true;
    const controls = animate(0, 2.2, {
      duration: 2.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setVal(n),
    });
    return () => controls.stop();
  };

  useEffect(() => {
    if (Math.round(stageIndex.get()) === index) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMotionValueEvent(stageIndex, "change", (v) => {
    if (Math.round(v) === index) start();
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1.2, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mt-7 max-w-md"
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-forest/45">
        <span className="h-px w-6 bg-emerald/50" />
        Why this matters
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className="font-display text-[44px] font-light leading-none tracking-tight md:text-[64px]"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.34 0.06 155) 0%, oklch(0.46 0.09 158) 45%, oklch(0.78 0.10 75) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            textShadow: "0 0 40px oklch(0.46 0.09 158 / 0.18)",
          }}
        >
          ₹{val.toFixed(1)}
        </span>
        <span className="font-display text-[20px] font-light text-forest-deep/85 md:text-[26px]">
          lakh crore
        </span>
      </div>
      <p className="mt-3 text-pretty text-[13px] leading-relaxed text-forest/70 md:text-[14px]">
        in financial assets left behind by ancestors in India lies unnoticed,
        forgotten, or unclaimed across various financial institutions.
      </p>
    </motion.div>
  );
}

function ProgressRail({ progress }: { progress: MotionValue<number> }) {
  const width = useTransform(progress, [0, 1], ["0%", "100%"]);
  return (
    <div className="absolute inset-x-0 bottom-8 z-20 mx-auto flex max-w-6xl items-center gap-4 px-6">
      <div className="text-[10px] uppercase tracking-[0.25em] text-forest/45">
        Pipeline
      </div>
      <div className="relative h-px flex-1 bg-forest-deep/10">
        <motion.div
          style={{ width }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald via-emerald to-gold"
        />
      </div>
      <div className="flex gap-1.5">
        {STAGES.map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-forest-deep/15"
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ stage canvas ----------------------------- */

function PipelineStage(props: {
  ingest: MotionValue<number>;
  scan: MotionValue<number>;
  extract: MotionValue<number>;
  structure: MotionValue<number>;
  graph: MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative h-[78vh] w-[min(1100px,94vw)] md:translate-x-[10%] lg:translate-x-[14%]">
        {/* Layer: floating documents (ingest) */}
        <FloatingDocs ingest={props.ingest} scan={props.scan} />
        {/* Layer: primary document with scan beam */}
        <PrimaryDocument
          scan={props.scan}
          extract={props.extract}
          structure={props.structure}
        />
        {/* Layer: extracted metadata chips */}
        <ExtractionChips
          extract={props.extract}
          structure={props.structure}
          graph={props.graph}
        />
        {/* Layer: structured ledger panel */}
        <LedgerPanel structure={props.structure} graph={props.graph} />
        {/* Layer: nominee graph */}
        <NomineeGraph graph={props.graph} />
      </div>
    </div>
  );
}

/* ----------------------------- 1. Floating docs --------------------------- */

const SECONDARY_DOCS = [
  { label: "Will & Testament", x: -38, y: -22, r: -8, c: "#FCFCFB" },
  { label: "Property Deed", x: 34, y: -28, r: 9, c: "#F8F4EA" },
  { label: "Bank Statement", x: -42, y: 18, r: 6, c: "#FCFCFB" },
  { label: "Mutual Fund Folio", x: 40, y: 24, r: -7, c: "#F4EFE3" },
];

function FloatingDocs({
  ingest,
  scan,
}: {
  ingest: MotionValue<number>;
  scan: MotionValue<number>;
}) {
  return (
    <>
      {SECONDARY_DOCS.map((d, i) => (
        <SecondaryDoc key={d.label} d={d} i={i} ingest={ingest} scan={scan} />
      ))}
    </>
  );
}

function SecondaryDoc({
  d,
  i,
  ingest,
  scan,
}: {
  d: (typeof SECONDARY_DOCS)[number];
  i: number;
  ingest: MotionValue<number>;
  scan: MotionValue<number>;
}) {
  const opacity = useTransform(ingest, [0, 0.4, 1], [0, 1, 1]);
  const fadeOnScan = useTransform(scan, [0, 1], [1, 0.35]);
  const o = useTransform([opacity, fadeOnScan], (v: number[]) => v[0] * v[1]);
  const x = useTransform(ingest, [0, 1], [d.x * 6, d.x * 4]);
  const y = useTransform(ingest, [0, 1], [d.y * 6, d.y * 3.5]);
  const rotate = useTransform(ingest, [0, 1], [d.r * 2, d.r]);
  const scale = useTransform(scan, [0, 1], [1, 0.92]);

  return (
    <motion.div
      style={{
        x,
        y,
        rotate,
        scale,
        opacity: o,
        background: d.c,
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.6) inset, 0 30px 50px -20px rgba(20,40,30,0.25), 0 8px 20px -10px rgba(20,40,30,0.18)",
      }}
      className="absolute left-1/2 top-1/2 -ml-[100px] -mt-[130px] h-[260px] w-[200px] overflow-hidden rounded-[10px] p-4"
    >
      <div className="text-[8px] uppercase tracking-[0.25em] text-forest/40">
        {d.label}
      </div>
      <div className="mt-3 h-[3px] w-12 rounded bg-forest/30" />
      <div className="mt-3 space-y-1.5">
        {Array.from({ length: 11 }).map((_, j) => (
          <div
            key={j}
            className="h-[3px] rounded bg-forest/15"
            style={{ width: `${55 + Math.sin((i + j) * 1.4) * 35}%` }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, j) => (
          <div key={j} className="h-4 rounded bg-forest/8" />
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------------------- 2. Primary document ------------------------- */

function PrimaryDocument({
  scan,
  extract,
  structure,
}: {
  scan: MotionValue<number>;
  extract: MotionValue<number>;
  structure: MotionValue<number>;
}) {
  // Doc moves left as ledger appears
  const x = useTransform(structure, [0, 1], [0, -180]);
  const scale = useTransform(structure, [0, 1], [1, 0.88]);
  const opacityOut = useTransform(structure, [0.5, 1], [1, 0.55]);

  // Scan beam
  const beamY = useTransform(scan, [0, 1], ["0%", "100%"]);
  const beamOpacity = useTransform(scan, [0, 0.1, 0.95, 1], [0, 1, 1, 0]);

  // OCR boxes appear during scan
  const ocrOpacity = useTransform(scan, [0.2, 0.7], [0, 1]);

  // Extraction lift — text rows fade slightly when extract begins
  const docDim = useTransform(extract, [0, 1], [1, 0.6]);

  return (
    <motion.div
      style={{ x, scale, opacity: opacityOut }}
      className="absolute left-1/2 top-1/2 z-10 -ml-[170px] -mt-[230px] h-[460px] w-[340px] overflow-hidden rounded-[14px]"
    >
      {/* paper */}
      <div
        className="relative h-full w-full bg-[#FDFBF5] p-6"
        style={{
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.8) inset, 0 50px 80px -25px rgba(20,40,30,0.35), 0 15px 30px -12px rgba(20,40,30,0.25)",
        }}
      >
        <motion.div style={{ opacity: docDim }} className="h-full">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[8px] uppercase tracking-[0.3em] text-forest/40">
                Life Insurance Corporation
              </div>
              <div className="mt-2 font-display text-[18px] text-forest-deep">
                Policy Schedule
              </div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full border border-forest/15">
              <span className="h-2 w-2 rounded-full bg-emerald" />
            </div>
          </div>

          <div className="mt-5 h-px bg-forest/10" />

          {/* Scannable rows with OCR overlays */}
          <div className="mt-5 space-y-3">
            <ScanRow label="Policy holder" value="Anand Bose" ocrOpacity={ocrOpacity} highlight={extract} />
            <ScanRow label="Policy number" value="POL-882-441-09" ocrOpacity={ocrOpacity} highlight={extract} />
            <ScanRow label="Sum assured" value="₹ 1,20,00,000" ocrOpacity={ocrOpacity} highlight={extract} />
            <ScanRow label="Primary nominee" value="Anaya Bose · daughter" ocrOpacity={ocrOpacity} highlight={extract} important />
            <ScanRow label="Custodian" value="LIC of India" ocrOpacity={ocrOpacity} highlight={extract} />
            <ScanRow label="Maturity" value="14 Mar 2042" ocrOpacity={ocrOpacity} highlight={extract} />
          </div>

          <div className="mt-6 space-y-1.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                className="h-[3px] rounded bg-forest/12"
                style={{ width: `${70 + Math.sin(j * 1.4) * 25}%` }}
              />
            ))}
          </div>
        </motion.div>

        {/* Scan beam */}
        <motion.div
          style={{ top: beamY, opacity: beamOpacity }}
          className="pointer-events-none absolute inset-x-0 -mt-10 h-20"
        >
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, oklch(0.74 0.10 220 / 0.0) 30%, oklch(0.74 0.14 220 / 0.55) 50%, oklch(0.74 0.10 220 / 0.0) 70%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 top-1/2 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.78 0.16 220), transparent)",
              boxShadow: "0 0 16px oklch(0.78 0.16 220 / 0.7)",
            }}
          />
        </motion.div>

        {/* Edge tracing glow */}
        <motion.div
          style={{ opacity: useTransform(scan, [0.4, 1], [0, 1]) }}
          className="pointer-events-none absolute inset-2 rounded-[10px]"
          // soft ai border
          // eslint-disable-next-line react/forbid-dom-props
        >
          <div
            className="h-full w-full rounded-[10px]"
            style={{
              boxShadow:
                "inset 0 0 0 1px oklch(0.74 0.12 220 / 0.4), inset 0 0 30px oklch(0.74 0.12 220 / 0.15)",
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

function ScanRow({
  label,
  value,
  ocrOpacity,
  highlight,
  important,
}: {
  label: string;
  value: string;
  ocrOpacity: MotionValue<number>;
  highlight: MotionValue<number>;
  important?: boolean;
}) {
  const bg = useTransform(highlight, [0, 1], [
    "rgba(45,106,79,0)",
    important ? "rgba(212,163,115,0.20)" : "rgba(45,106,79,0.10)",
  ]);
  return (
    <motion.div
      style={{ background: bg as never }}
      className="relative flex items-center justify-between rounded-[4px] px-2 py-1.5 text-[11px]"
    >
      <span className="text-forest/55">{label}</span>
      <span className="text-forest-deep">{value}</span>
      {/* OCR bracket */}
      <motion.span
        style={{ opacity: ocrOpacity }}
        className="pointer-events-none absolute inset-0 rounded-[4px]"
      >
        <span className="absolute -left-[3px] top-0 h-1.5 w-1.5 border-l border-t border-cyan-soft" />
        <span className="absolute -right-[3px] top-0 h-1.5 w-1.5 border-r border-t border-cyan-soft" />
        <span className="absolute -left-[3px] bottom-0 h-1.5 w-1.5 border-b border-l border-cyan-soft" />
        <span className="absolute -right-[3px] bottom-0 h-1.5 w-1.5 border-b border-r border-cyan-soft" />
      </motion.span>
    </motion.div>
  );
}

/* ---------------------------- 3. Extraction chips ------------------------- */

const CHIPS = [
  { label: "policy_no", value: "POL-882-441-09", ox: 30, oy: -160 },
  { label: "sum_assured", value: "₹1.20 Cr", ox: 60, oy: -90 },
  { label: "nominee", value: "Anaya Bose", ox: 80, oy: -10, gold: true },
  { label: "relation", value: "daughter", ox: 60, oy: 70 },
  { label: "custodian", value: "LIC of India", ox: 30, oy: 150 },
  { label: "maturity", value: "2042-03-14", ox: -10, oy: 200 },
];

function ExtractionChips({
  extract,
  structure,
  graph,
}: {
  extract: MotionValue<number>;
  structure: MotionValue<number>;
  graph: MotionValue<number>;
}) {
  return (
    <>
      {CHIPS.map((c, i) => (
        <Chip key={c.label} c={c} i={i} extract={extract} structure={structure} graph={graph} />
      ))}
    </>
  );
}

function Chip({
  c,
  i,
  extract,
  structure,
  graph,
}: {
  c: (typeof CHIPS)[number];
  i: number;
  extract: MotionValue<number>;
  structure: MotionValue<number>;
  graph: MotionValue<number>;
}) {
  const opacity = useTransform(extract, [0, 0.3, 1], [0, 1, 1]);
  const fadeOut = useTransform(graph, [0, 1], [1, 0]);
  const o = useTransform([opacity, fadeOut], (v: number[]) => v[0] * v[1]);

  // Start at doc center, drift to ox/oy during extract, then move into ledger panel during structure
  const x = useTransform(
    [extract, structure] as MotionValue<number>[],
    ([e, s]: number[]) => (1 - s) * (c.ox * e) + s * 220,
  );
  const y = useTransform(
    [extract, structure] as MotionValue<number>[],
    ([e, s]: number[]) => (1 - s) * (c.oy * e) + s * (-180 + i * 36),
  );
  const scale = useTransform(structure, [0, 1], [1, 0.88]);

  return (
    <motion.div
      style={{ x, y, opacity: o, scale }}
      className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
    >
      <div
        className={
          "flex items-center gap-2 rounded-full border bg-white/85 px-3 py-1.5 text-[11px] backdrop-blur-md " +
          (c.gold
            ? "border-gold/50 ring-glow-gold"
            : "border-emerald/30 shadow-[0_8px_24px_-12px_rgba(45,106,79,0.4)]")
        }
      >
        <span
          className={
            "h-1.5 w-1.5 rounded-full " + (c.gold ? "bg-gold" : "bg-emerald")
          }
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-forest/55">
          {c.label}
        </span>
        <span className="text-forest-deep">{c.value}</span>
      </div>
    </motion.div>
  );
}

/* ----------------------------- 4. Ledger panel ---------------------------- */

function LedgerPanel({
  structure,
  graph,
}: {
  structure: MotionValue<number>;
  graph: MotionValue<number>;
}) {
  const opacity = useTransform(structure, [0.1, 0.7], [0, 1]);
  const fade = useTransform(graph, [0, 1], [1, 0.25]);
  const o = useTransform([opacity, fade], (v: number[]) => v[0] * v[1]);
  const x = useTransform(structure, [0, 1], [120, 200]);
  const y = useTransform(structure, [0, 1], [40, -10]);

  return (
    <motion.div
      style={{ x, y, opacity: o }}
      className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
    >
      <div className="glass-light w-[360px] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald">
            Estate ledger · record
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-forest/55">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            stored · encrypted
          </div>
        </div>
        <div className="mt-4 font-display text-[18px] text-forest-deep">
          Life Insurance · POL-882-441-09
        </div>
        <div className="mt-3 h-px bg-forest-deep/10" />
        <div className="mt-3 space-y-2 text-[12px]">
          {[
            ["holder", "Anand Bose"],
            ["sum_assured", "₹ 1,20,00,000"],
            ["nominee", "Anaya Bose · daughter"],
            ["contingent", "— missing"],
            ["custodian", "LIC of India"],
            ["maturity", "2042-03-14"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-forest/50">
                {k}
              </span>
              <span
                className={
                  v.startsWith("—") ? "text-destructive/85" : "text-forest-deep"
                }
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------ 5. Nominee map ---------------------------- */

function NomineeGraph({ graph }: { graph: MotionValue<number> }) {
  const opacity = useTransform(graph, [0.05, 0.6], [0, 1]);
  return (
    <motion.div
      style={{ opacity }}
      className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
    >
      <div className="glass-light h-[480px] w-[min(720px,90vw)] rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald">
              Continuity map · activated
            </div>
            <div className="mt-2 font-display text-[20px] text-forest-deep">
              Estate intelligence is now live.
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald/25 bg-emerald/10 px-3 py-1 text-[11px] text-emerald">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            7 records · 4 nominees · 1 conflict
          </div>
        </div>

        <div className="relative mt-6 h-[360px]">
          <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="edge" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#2D6A4F" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#D4A373" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {[
              [50, 30, 20, 12],
              [50, 30, 80, 14],
              [50, 30, 18, 48],
              [50, 30, 82, 50],
              [20, 12, 80, 14],
            ].map(([x1, y1, x2, y2], i) => (
              <motion.line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="url(#edge)"
                strokeWidth="0.25"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: 0.2 + i * 0.15 }}
              />
            ))}
          </svg>

          {[
            { x: 50, y: 50, label: "Anand Bose", primary: true, sub: "policy holder" },
            { x: 20, y: 20, label: "Anaya Bose", sub: "primary nominee · daughter" },
            { x: 80, y: 23, label: "Priya Bose", sub: "spouse" },
            { x: 18, y: 80, label: "Trustee", sub: "tier 2" },
            { x: 82, y: 83, label: "Executor", sub: "tier 2" },
          ].map((n, i) => (
            <motion.div
              key={n.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={
                    n.primary
                      ? "grid h-11 w-11 place-items-center rounded-full bg-gradient-gold ring-glow-gold"
                      : "grid h-8 w-8 place-items-center rounded-full border border-emerald/40 bg-white"
                  }
                >
                  <span
                    className={
                      "rounded-full " +
                      (n.primary ? "h-2 w-2 bg-forest-deep" : "h-1.5 w-1.5 bg-emerald")
                    }
                  />
                </span>
                <div className="rounded-full border border-forest-deep/10 bg-white/80 px-2.5 py-0.5 text-[10.5px] text-forest-deep backdrop-blur">
                  {n.label}
                </div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-forest/50">
                  {n.sub}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}