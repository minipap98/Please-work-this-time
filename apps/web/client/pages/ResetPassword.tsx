import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabaseMissing } from "@/lib/supabase";
import { BosunLogo } from "@/components/marketing/BosunLogo";
import { passwordProblem } from "@shared/auth";
import { postLoginPath } from "@shared/api";

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition";

/**
 * Where the password-reset email lands. supabase-js reads the recovery code out of the URL and
 * starts a session, so by the time the form shows, updateUser can set the new password.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, profile, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setSaving(true);
    const { error: err } = await updatePassword(password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(postLoginPath(profile?.role, profile?.onboarding_complete), { replace: true });
  }

  let body: React.ReactNode;
  if (supabaseMissing) {
    body = <p className="text-sm text-red-600">Supabase keys are missing. Password reset will not work until they are set.</p>;
  } else if (loading) {
    body = <p className="text-sm text-muted-foreground">Checking your link…</p>;
  } else if (!user) {
    body = (
      <>
        <p className="text-sm text-foreground font-semibold">This link has expired or was already used.</p>
        <p className="mt-1 text-sm text-muted-foreground">Reset links work once and only for a short while.</p>
        <Link to="/login?mode=forgot" className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:underline">
          Request a new link
        </Link>
      </>
    );
  } else {
    body = (
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a new password for <span className="font-semibold text-foreground">{user.email}</span>.
        </p>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">New password</label>
          <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">Confirm password</label>
          <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
        <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save new password"}
        </button>
      </form>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="inline-flex mb-8"><BosunLogo className="h-7" /></Link>
      <div className="w-full max-w-sm bg-white rounded-xl border border-border shadow-card p-6">
        <h1 className="text-lg font-bold text-foreground mb-3">Reset your password</h1>
        {body}
      </div>
    </div>
  );
}
