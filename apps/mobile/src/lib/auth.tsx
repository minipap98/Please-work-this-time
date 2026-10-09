import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@bosun/shared/database.types";
import type { AppRole } from "@bosun/shared/api";
import { resetPasswordRedirect, signUpOptions } from "@bosun/shared/auth";
import { LOCATION_KEYS, isMissingColumn, withoutKeys } from "@bosun/shared/db/optionalColumns";
import { SITE_URL } from "./env";
import { supabase, supabaseMissing } from "./supabase";

export type Profile = Tables<"profiles">;

interface AuthValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string, role: AppRole) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Emails a reset link; it opens getbosun.app/reset-password, where the person picks a new password. */
  resetPassword: (email: string) => Promise<string | null>;
  resendConfirmation: (email: string) => Promise<string | null>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const user = session?.user ?? null;

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    if (supabaseMissing) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (data.session?.user) fetchProfile(data.session.user.id).finally(() => setLoading(false));
        else setLoading(false);
      })
      // A Keychain failure must land on sign-in, not an endless spinner.
      .catch(() => setLoading(false));
    // Same rule as the web: never await Supabase inside this callback (it holds the auth lock).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        const id = next.user.id;
        setTimeout(() => fetchProfile(id).finally(() => setLoading(false)), 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn: async (email, password) => {
        if (supabaseMissing) return "Bosun isn't configured on this build.";
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
      },
      signUp: async (email, password, name, role) => {
        if (supabaseMissing) return "Bosun isn't configured on this build.";
        const { error } = await supabase.auth.signUp({ email, password, options: signUpOptions(name, role, `${SITE_URL}/login`) });
        return error?.message ?? null;
      },
      signOut: async () => {
        if (!supabaseMissing) await supabase.auth.signOut();
        setProfile(null);
      },
      resetPassword: async (email) => {
        if (supabaseMissing) return "Bosun isn't configured on this build.";
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetPasswordRedirect(SITE_URL) });
        return error?.message ?? null;
      },
      resendConfirmation: async (email) => {
        if (supabaseMissing) return "Bosun isn't configured on this build.";
        const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${SITE_URL}/login` } });
        return error?.message ?? null;
      },
      updateProfile: async (patch) => {
        if (!user) return;
        let { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
        if (isMissingColumn(error)) ({ error } = await supabase.from("profiles").update(withoutKeys(patch, LOCATION_KEYS)).eq("id", user.id));
        if (error) throw new Error(error.message);
        await fetchProfile(user.id);
      },
      refreshProfile: async () => {
        if (user) await fetchProfile(user.id);
      },
    }),
    [user, session, profile, loading, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
