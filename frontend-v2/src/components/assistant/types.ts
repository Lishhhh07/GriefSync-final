export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "text" | "insight-card" | "document-preview";
  metadata?: {
    title?: string;
    category?: string;
    fields?: { label: string; value: string }[];
    status?: string;
  };
  followUps?: string[];
}

export interface SuggestedPrompt {
  id: string;
  text: string;
  icon: string;
  category: "vault" | "nominees" | "lifeline" | "general";
}

export type AssistantStatus = "connected" | "thinking" | "listening" | "idle";
