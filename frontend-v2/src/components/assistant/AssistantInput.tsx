import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useAssistantStore } from "./useAssistantStore";

export function AssistantInput() {
  const [value, setValue] = useState("");
  const { sendMessage, isStreaming } = useAssistantStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div className="relative border-t border-[oklch(1_0_0/0.06)] px-4 py-3">
      {/* Top glow line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(1_0_0/0.08)] to-transparent" />

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-end gap-2 rounded-xl border border-[oklch(1_0_0/0.07)] bg-[oklch(1_0_0/0.03)] px-3 py-2 transition-all duration-300 focus-within:border-emerald/25 focus-within:shadow-[0_0_20px_oklch(0.46_0.09_158/0.08)]">
          {/* Attachment button */}
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-[oklch(1_0_0/0.06)] hover:text-ivory/70"
            aria-label="Attach file"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path
                d="M14 8.5L8.5 14C7.12 15.38 4.88 15.38 3.5 14C2.12 12.62 2.12 10.38 3.5 9L9.5 3C10.33 2.17 11.67 2.17 12.5 3C13.33 3.83 13.33 5.17 12.5 6L7 11.5C6.72 11.78 6.28 11.78 6 11.5C5.72 11.22 5.72 10.78 6 10.5L11 5.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your estate…"
            rows={1}
            disabled={isStreaming}
            className="max-h-[120px] min-h-[28px] flex-1 resize-none bg-transparent text-[13px] text-ivory/90 placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50"
          />

          {/* Send button */}
          <motion.button
            type="submit"
            disabled={!value.trim() || isStreaming}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald/80 text-ivory transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald"
            aria-label="Send message"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </div>
      </form>
    </div>
  );
}
