import { motion } from "framer-motion";
import { useAssistantStore } from "./useAssistantStore";
import { suggestedPrompts, contextualPrompts } from "./mock-data";

export function AssistantEmptyState() {
  const { sendMessage, currentPage } = useAssistantStore();

  const prompts =
    contextualPrompts[currentPage] ?? suggestedPrompts.slice(0, 4);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8">
      {/* Ambient visualization */}
      <motion.div
        className="relative mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative h-24 w-24">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-emerald/15"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
          {/* Middle ring */}
          <motion.div
            className="absolute inset-3 rounded-full border border-cyan-soft/12"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          {/* Inner glow */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald/15 to-cyan-soft/10 blur-sm" />
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-emerald/10 to-transparent border border-emerald/20" />
          {/* Center dot */}
          <motion.div
            className="absolute inset-[38%] rounded-full bg-emerald/60"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating particles */}
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-emerald/40"
              style={{
                top: `${20 + i * 18}%`,
                left: `${10 + i * 22}%`,
              }}
              animate={{
                y: [0, -6, 0],
                x: [0, 3, 0],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.4,
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <h3 className="text-[15px] font-medium text-ivory/85 tracking-tight">
          Continuity Intelligence
        </h3>
        <p className="mt-2 max-w-[260px] text-[12.5px] leading-relaxed text-muted-foreground/70">
          Your estate data is analyzed continuously. Ask anything about your
          documents, nominees, or continuity readiness.
        </p>
      </motion.div>

      {/* Suggested prompts */}
      <motion.div
        className="mt-8 w-full space-y-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        {prompts.map((prompt, i) => (
          <motion.button
            key={prompt.id}
            onClick={() => sendMessage(prompt.text)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.08 }}
            whileHover={{ x: 4, backgroundColor: "oklch(1 0 0 / 0.06)" }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center gap-3 rounded-xl border border-[oklch(1_0_0/0.05)] px-4 py-3 text-left transition-all duration-300 hover:border-emerald/20 hover:shadow-[0_0_20px_oklch(0.46_0.09_158/0.06)]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[oklch(1_0_0/0.04)] text-[12px] text-emerald/70">
              {prompt.icon}
            </span>
            <span className="text-[12.5px] text-ivory/70">{prompt.text}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className="ml-auto text-muted-foreground/40"
            >
              <path
                d="M4.5 2.5L8 6L4.5 9.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
