import type { SuggestedPrompt } from "./types";

export const suggestedPrompts: SuggestedPrompt[] = [
  {
    id: "1",
    text: "Summarize my estate readiness",
    icon: "◈",
    category: "general",
  },
  {
    id: "2",
    text: "Analyze nominee conflicts",
    icon: "⌬",
    category: "nominees",
  },
  {
    id: "3",
    text: "Review uploaded documents",
    icon: "▤",
    category: "vault",
  },
  {
    id: "4",
    text: "Who gets notified first?",
    icon: "⊛",
    category: "lifeline",
  },
  {
    id: "5",
    text: "What information is missing?",
    icon: "◉",
    category: "general",
  },
];

export const contextualPrompts: Record<string, SuggestedPrompt[]> = {
  vault: [
    { id: "v1", text: "Scan for missing documents", icon: "▤", category: "vault" },
    { id: "v2", text: "Summarize insurance coverage", icon: "◈", category: "vault" },
    { id: "v3", text: "Check document expiry dates", icon: "◉", category: "vault" },
  ],
  nominees: [
    { id: "n1", text: "Detect nominee gaps", icon: "⌬", category: "nominees" },
    { id: "n2", text: "Compare nominee allocations", icon: "◈", category: "nominees" },
    { id: "n3", text: "Suggest contingent nominees", icon: "⊛", category: "nominees" },
  ],
  lifeline: [
    { id: "l1", text: "Review escalation order", icon: "◉", category: "lifeline" },
    { id: "l2", text: "Test notification chain", icon: "⊛", category: "lifeline" },
    { id: "l3", text: "Analyze check-in patterns", icon: "≋", category: "lifeline" },
  ],
};
