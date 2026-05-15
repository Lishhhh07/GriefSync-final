import { create } from "zustand";
import type { Message, AssistantStatus } from "./types";
import { apiAsk } from "@/lib/api";

interface AssistantState {
  isOpen: boolean;
  messages: Message[];
  status: AssistantStatus;
  isStreaming: boolean;
  currentPage: string;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setPage: (page: string) => void;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
}

let messageCounter = 0;

function generateId() {
  messageCounter += 1;
  return `msg-${Date.now()}-${messageCounter}`;
}

function hasToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("griefsync_token");
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  isOpen: false,
  messages: [],
  status: "connected",
  isStreaming: false,
  currentPage: "overview",

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setPage: (page) => set({ currentPage: page }),

  sendMessage: async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: new Date(),
      type: "text",
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      status: "thinking",
      isStreaming: true,
    }));

    if (!hasToken()) {
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "Please log in to use the AI assistant. Your estate data is needed to provide personalized answers.",
        timestamp: new Date(),
        type: "text",
      };
      set((s) => ({
        messages: [...s.messages, assistantMessage],
        status: "connected",
        isStreaming: false,
      }));
      return;
    }

    try {
      const history = get()
        .messages.slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await apiAsk(content, history);

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: res.answer,
        timestamp: new Date(),
        type: "text",
        followUps: res.suggested_follow_ups?.length ? res.suggested_follow_ups : undefined,
      };

      set((s) => ({
        messages: [...s.messages, assistantMessage],
        status: "connected",
        isStreaming: false,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: `Sorry, I couldn't process your request: ${errorMsg}`,
        timestamp: new Date(),
        type: "text",
      };

      set((s) => ({
        messages: [...s.messages, assistantMessage],
        status: "connected",
        isStreaming: false,
      }));
    }
  },

  clearMessages: () => set({ messages: [] }),
}));
