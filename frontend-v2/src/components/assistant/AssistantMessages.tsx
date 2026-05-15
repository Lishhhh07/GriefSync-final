import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAssistantStore } from "./useAssistantStore";
import type { Message } from "./types";

export function AssistantMessages() {
  const { messages, isStreaming } = useAssistantStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-4 scroll-smooth" style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(1 0 0 / 0.1) transparent" }}>
      <div className="space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            {msg.role === "user" ? (
              <UserMessage message={msg} />
            ) : (
              <AssistantMessage message={msg} />
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 py-2"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald/10 border border-emerald/15">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-emerald/70">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-[oklch(1_0_0/0.04)] px-4 py-3 border border-[oklch(1_0_0/0.04)]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-emerald/50"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[oklch(0.22_0.015_160)] to-[oklch(0.19_0.01_160)] px-4 py-3 border border-[oklch(1_0_0/0.06)] shadow-[0_2px_8px_oklch(0_0_0/0.2)]">
        <p className="text-[13px] leading-relaxed text-ivory/90">{message.content}</p>
        <span className="mt-1.5 block text-[10px] text-muted-foreground/50 text-right">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: Message }) {
  const { sendMessage } = useAssistantStore();

  if (message.type === "insight-card" && message.metadata) {
    return <InsightCard message={message} />;
  }

  if (message.type === "document-preview" && message.metadata) {
    return <DocumentPreview message={message} />;
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald/10 border border-emerald/15 mt-0.5">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-emerald/70">
          <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="max-w-[88%]">
        <div className="rounded-2xl rounded-tl-md bg-[oklch(1_0_0/0.03)] px-4 py-3 border border-[oklch(1_0_0/0.05)]">
          <div className="text-[13px] leading-[1.7] text-ivory/80 whitespace-pre-wrap">
            <StreamedText text={message.content} />
          </div>
        </div>
        {message.followUps && message.followUps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 px-1">
            {message.followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="rounded-lg border border-[oklch(1_0_0/0.08)] bg-[oklch(1_0_0/0.03)] px-2.5 py-1.5 text-[11px] text-ivory/60 transition-all hover:border-emerald/25 hover:text-ivory/80 hover:bg-[oklch(1_0_0/0.05)]"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <span className="mt-1.5 block text-[10px] text-muted-foreground/50 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function InsightCard({ message }: { message: Message }) {
  const { metadata } = message;
  if (!metadata) return null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald/10 border border-emerald/15 mt-0.5">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-emerald/70">
          <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="max-w-[90%] w-full">
        <motion.div
          className="overflow-hidden rounded-2xl rounded-tl-md border border-emerald/15 bg-gradient-to-br from-[oklch(0.18_0.015_158/0.8)] to-[oklch(0.14_0.01_160/0.9)] shadow-[0_4px_20px_oklch(0.46_0.09_158/0.08)]"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-[oklch(1_0_0/0.05)] px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald/60">
                {metadata.category}
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-ivory/90">
                {metadata.title}
              </div>
            </div>
            {metadata.status && (
              <span className="rounded-full bg-emerald/10 px-2.5 py-1 text-[10px] text-emerald border border-emerald/20">
                {metadata.status}
              </span>
            )}
          </div>

          {/* Card fields */}
          <div className="divide-y divide-[oklch(1_0_0/0.04)] px-4">
            {metadata.fields?.map((field, i) => (
              <motion.div
                key={i}
                className="flex items-center justify-between py-2.5"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <span className="text-[12px] text-muted-foreground/70">{field.label}</span>
                <span className="text-[12px] text-ivory/75 text-right max-w-[55%]">{field.value}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <span className="mt-1.5 block text-[10px] text-muted-foreground/50 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function DocumentPreview({ message }: { message: Message }) {
  const { metadata } = message;
  if (!metadata) return null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald/10 border border-emerald/15 mt-0.5">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-emerald/70">
          <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="max-w-[90%] w-full">
        <motion.div
          className="overflow-hidden rounded-2xl rounded-tl-md border border-gold/15 bg-gradient-to-br from-[oklch(0.18_0.012_75/0.6)] to-[oklch(0.14_0.008_160/0.9)] shadow-[0_4px_20px_oklch(0.78_0.10_75/0.06)]"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Card header */}
          <div className="flex items-center gap-2 border-b border-[oklch(1_0_0/0.05)] px-4 py-3">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gold/70">
              <rect x="3" y="1" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.5 5H10.5M5.5 7.5H10.5M5.5 10H8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gold/60">
                {metadata.category}
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-ivory/90">
                {metadata.title}
              </div>
            </div>
          </div>

          {/* Document list */}
          <div className="space-y-0.5 p-2">
            {metadata.fields?.map((field, i) => (
              <motion.div
                key={i}
                className="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-[oklch(1_0_0/0.04)]"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <span className="text-[12px] text-ivory/75">{field.label}</span>
                <span className={`text-[11px] ${field.value.includes("Alert") || field.value.includes("Stale") ? "text-gold/80" : field.value.includes("Pending") ? "text-muted-foreground/60" : "text-emerald/70"}`}>
                  {field.value}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <span className="mt-1.5 block text-[10px] text-muted-foreground/50 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function StreamedText({ text }: { text: string }) {
  // Split by markdown bold markers for simple formatting
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <span key={i} className="font-medium text-ivory/95">
              {part.slice(2, -2)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
