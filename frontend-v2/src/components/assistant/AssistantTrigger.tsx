import { motion } from "framer-motion";
import { useAssistantStore } from "./useAssistantStore";

export function AssistantTrigger() {
  const { toggle, isOpen, status } = useAssistantStore();

  return (
    <motion.button
      onClick={toggle}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="group fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald/50"
      aria-label={isOpen ? "Close assistant" : "Open continuity assistant"}
    >
      {/* Ambient glow rings */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald/20 to-cyan-soft/20 blur-xl opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
      <motion.span
        className="absolute inset-0 rounded-full border border-emerald/20"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border border-cyan-soft/15"
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Main button surface */}
      <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.18_0.02_158)] to-[oklch(0.12_0.015_160)] border border-emerald/25 shadow-[0_0_30px_oklch(0.46_0.09_158/0.2),inset_0_1px_0_oklch(1_0_0/0.06)]">
        {/* Icon */}
        <motion.span
          animate={isOpen ? { rotate: 45 } : { rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative"
        >
          {isOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ivory/90">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-ivory/90">
              <path d="M12 3C7.03 3 3 6.58 3 11c0 2.42 1.34 4.58 3.43 6.02L5 21l4.2-2.12C9.73 18.96 10.85 19 12 19c4.97 0 9-3.58 9-8s-4.03-8-9-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <circle cx="8.5" cy="11" r="1" fill="currentColor" opacity="0.7" />
              <circle cx="12" cy="11" r="1" fill="currentColor" opacity="0.7" />
              <circle cx="15.5" cy="11" r="1" fill="currentColor" opacity="0.7" />
            </svg>
          )}
        </motion.span>

        {/* Status indicator */}
        {status === "connected" && !isOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-50" />
            <span className="relative h-3 w-3 rounded-full bg-emerald border border-[oklch(0.14_0.005_160)]" />
          </span>
        )}
      </span>
    </motion.button>
  );
}
