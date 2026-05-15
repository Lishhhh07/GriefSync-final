import { create } from "zustand";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  hydrate: () => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  hydrate: () => {
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }
    const token = localStorage.getItem("griefsync_token");
    const raw = localStorage.getItem("griefsync_user");
    let user: User | null = null;
    if (raw) {
      try { user = JSON.parse(raw); } catch { /* ignore */ }
    }
    set({ token, user, isLoading: false });
  },

  login: (token, user) => {
    localStorage.setItem("griefsync_token", token);
    localStorage.setItem("griefsync_user", JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem("griefsync_token");
    localStorage.removeItem("griefsync_user");
    set({ token: null, user: null });
  },
}));
