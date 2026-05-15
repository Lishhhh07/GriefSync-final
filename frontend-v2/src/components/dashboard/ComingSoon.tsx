import { motion } from "framer-motion";

export function ComingSoon({
  tag,
  title,
  body,
}: {
  tag: string;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-3xl py-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-[10px] uppercase tracking-[0.25em] text-gold">{tag}</div>
        <h1 className="mt-4 font-display text-4xl font-light tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-[15px] text-muted-foreground">{body}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-12 overflow-hidden rounded-2xl border border-border bg-card/60 p-10 backdrop-blur-md"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(45,106,79,0.18), transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(212,163,115,0.14), transparent 55%)",
          }}
        />
        <div className="relative grid gap-8 md:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Module preview
            </div>
            <div className="mt-3 font-display text-2xl">Calibrating with your data…</div>
            <p className="mt-3 text-[13.5px] text-muted-foreground">
              The full experience activates as your vault populates. You can begin
              by uploading a single document.
            </p>
            <button className="mt-6 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition-transform hover:-translate-y-px">
              Upload a document
            </button>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2.5 text-[12.5px]"
              >
                <span className="text-muted-foreground">
                  {["Reading metadata", "Detecting entities", "Mapping nominees", "Cross-referencing", "Indexed"][i]}
                </span>
                <span
                  className={
                    i < 4
                      ? "h-1.5 w-1.5 animate-pulse rounded-full bg-gold"
                      : "h-1.5 w-1.5 rounded-full bg-emerald"
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
