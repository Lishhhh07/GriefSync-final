import { motion } from "framer-motion";
import { useAssistantStore } from "./useAssistantStore";

export function AssistantHeader() {
  const { status, close } = useAssistantStore();

  const statusText = {
    connected: "Connected to your estate vault",
    thinking: "Analyzing your data…",
    listening: "Listening…",
    idle: "Standing by",
  }[status];

  return (
    <div className="relative flex items-center justify-between border-b border-[oklch(1_0_0/0.06)] px-5 py-4">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald/30 to-transparent" />

      <div className="flex items-center gap-3">
        {/* AI identity icon */}
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald/20 to-cyan-soft/10 border border-emerald/20">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-emerald">
            <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.6" />
          </svg>
          {/* Pulse */}
          <motion.span
            className="absolute inset-0 rounded-lg border border-emerald/30"
            animate={{ opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div>
          <div className="text-[13px] font-medium text-ivory/90 tracking-tight">
            Continuity Intelligence
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  status === "connected"
                    ? "oklch(0.46 0.09 158)"
                    : status === "thinking"
                    ? "oklch(0.78 0.10 75)"
                    : "oklch(0.62 0.012 250)",
              }}
              animate={
                status === "thinking"
                  ? { opacity: [1, 0.4, 1] }
                  : { opacity: 1 }
              }
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="text-[11px] text-muted-foreground/80">{statusText}</span>
          </div>
        </div>
      </div>

      <button
        onClick={close}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-[oklch(1_0_0/0.06)] hover:text-ivory/80"
        aria-label="Close assistant"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
