import { create } from "zustand";
import { supabase } from "../lib/supabase";

type User = {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
} | null;

type AuthState = {
  user: User;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  // Auth actions
  setUser: (user: User) => void;
  clearError: () => void;
  fetchUser: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

// Zustand Store
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null }),

  // ✅ Fetch current session
  fetchUser: async () => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.warn("Auth fetch error:", error.message);
        set({ user: null, error: error.message });
      } else {
        set({ user: data.user || null });
      }
    } catch (err: any) {
      console.error("Unexpected fetch error:", err);
      set({ error: err.message || "An unknown error occurred" });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  // ✅ Sign up new user
  signUp: async (email, password) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Optional: Supabase may require email verification
      if (data.user) {
        set({ user: data.user });
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      set({ error: err.message || "Signup failed" });
    } finally {
      set({ loading: false });
    }
  },

  // ✅ Sign in existing user
  signIn: async (email, password) => {
    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({ user: data.user });
    } catch (err: any) {
      console.error("Signin error:", err);
      set({ error: err.message || "Login failed" });
    } finally {
      set({ loading: false });
    }
  },

  // ✅ Log out user
  logout: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (err: any) {
      console.error("Logout error:", err);
      set({ error: err.message || "Logout failed" });
    } finally {
      set({ loading: false });
    }
  },
}));

// ✅ Watch for realtime auth changes globally
supabase.auth.onAuthStateChange((_event, session) => {
  const { setUser } = useAuthStore.getState();
  setUser(session?.user ?? null);
});
