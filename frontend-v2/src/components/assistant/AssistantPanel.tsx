import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssistantStore } from "./useAssistantStore";
import { AssistantHeader } from "./AssistantHeader";
import { AssistantMessages } from "./AssistantMessages";
import { AssistantInput } from "./AssistantInput";
import { AssistantEmptyState } from "./AssistantEmptyState";

export function AssistantPanel() {
  const { isOpen, messages } = useAssistantStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        useAssistantStore.getState().close();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[101] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => useAssistantStore.getState().close()}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(8px)" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            className="fixed bottom-24 right-6 z-[102] flex h-[min(680px,calc(100vh-140px))] w-[min(420px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl border border-[oklch(1_0_0/0.08)] shadow-[0_0_0_1px_oklch(0.46_0.09_158/0.1),0_40px_100px_-20px_oklch(0_0_0/0.6),0_0_60px_oklch(0.46_0.09_158/0.08)] md:bottom-24 md:right-6"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.16 0.01 158 / 0.97) 0%, oklch(0.12 0.008 160 / 0.98) 100%)",
              backdropFilter: "blur(40px) saturate(180%)",
            }}
            role="dialog"
            aria-label="Continuity Intelligence Assistant"
          >
            {/* Ambient gradient overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse at 20% 0%, oklch(0.46 0.09 158 / 0.15), transparent 50%), radial-gradient(ellipse at 80% 100%, oklch(0.78 0.10 75 / 0.08), transparent 50%)",
              }}
            />

            {/* Grain texture */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`
            }} />

            <div className="relative flex h-full flex-col">
              <AssistantHeader />
              <div className="flex-1 overflow-hidden">
                {messages.length === 0 ? (
                  <AssistantEmptyState />
                ) : (
                  <AssistantMessages />
                )}
              </div>
              <AssistantInput />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
