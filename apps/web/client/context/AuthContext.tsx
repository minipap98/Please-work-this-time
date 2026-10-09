import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, supabaseMissing } from "@/lib/supabase";
import { persistDemoMode } from "@/lib/demoMode";
import { LOCATION_KEYS, isMissingColumn, withoutKeys } from "@/lib/optionalColumns";
import { resetPasswordRedirect, signUpOptions } from "@shared/auth";
import type { Tables } from "@/lib/database.types";

interface AuthContextValue {
  user: User | null;
  profile: Tables<"profiles"> | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: "owner" | "vendor") => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /** Emails a reset link that lands on /reset-password. Never says whether the address exists. */
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  /** Sets a new password for the signed-in (or recovery) session. */
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  /** Re-sends the sign-up confirmation email. */
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (patch: Partial<Tables<"profiles">>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    if (supabaseMissing) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Tables<"profiles"> | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    if (supabaseMissing) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Never await Supabase calls inside this callback: supabase-js holds its
        // auth lock while it runs, so a query here deadlocks every later request.
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const id = session.user.id;
          setTimeout(() => {
            fetchProfile(id).finally(() => setLoading(false));
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, name: string, role: "owner" | "vendor") => {
    if (supabaseMissing) return { error: "Bosun is not configured. Missing Supabase keys." };
    persistDemoMode(false);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: signUpOptions(name, role, `${window.location.origin}/login`),
    });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    if (supabaseMissing) return { error: "Bosun is not configured. Missing Supabase keys." };
    persistDemoMode(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (!supabaseMissing) await supabase.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    if (supabaseMissing) return { error: "Bosun is not configured. Missing Supabase keys." };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetPasswordRedirect(window.location.origin) });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    if (supabaseMissing) return { error: "Bosun is not configured. Missing Supabase keys." };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const resendConfirmation = async (email: string) => {
    if (supabaseMissing) return { error: "Bosun is not configured. Missing Supabase keys." };
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/login` } });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (patch: Partial<Tables<"profiles">>) => {
    if (!user || supabaseMissing) return;
    let { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (isMissingColumn(error)) {
      ({ error } = await supabase.from("profiles").update(withoutKeys(patch, LOCATION_KEYS)).eq("id", user.id));
    }
    if (error) throw new Error(error.message);
    await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signOut, resetPassword, updatePassword, resendConfirmation, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
