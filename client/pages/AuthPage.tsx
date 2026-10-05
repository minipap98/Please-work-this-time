import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { supabaseMissing } from "@/lib/supabase";
import { BosunLogo } from "@/components/marketing/BosunLogo";

const PROMISES = [
  "Every service on your boat in one log, verified by the shop that did it",
  "Local shops bid on the work you post; you pick who gets it",
  "Maintenance reminders built from your engine's own schedule",
];

type Mode = "signin" | "signup";

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp } = useAuth();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "vendor">(searchParams.get("role") === "vendor" ? "vendor" : "owner");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
    setName("");
    setRole("owner");
    setError("");
    setSuccess("");
    setShowPassword(false);
  }

  function switchMode(next: Mode) {
    resetForm();
    setMode(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        } else {
          const next = searchParams.get("next");
          navigate(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");
        }
      } else {
        if (!name.trim()) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        const { error: err } = await signUp(email, password, name, role);
        if (err) {
          setError(err);
        } else {
          setSuccess("Account created! Check your email to confirm your address, then sign in.");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Brand panel (desktop) */}
      <aside className="hidden lg:flex relative overflow-hidden bg-[#052443] text-white flex-col justify-between p-12">
        <div className="absolute -top-32 -right-24 w-[480px] h-[480px] rounded-full bg-sky-500/10 blur-3xl" />
        <Link to="/" className="relative inline-flex w-fit">
          <BosunLogo tone="light" className="h-7" />
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight leading-tight">
            Your boat's whole story,
            <br />
            <span className="text-sky-300">in one place.</span>
          </h2>
          <ul className="mt-8 space-y-3">
            {PROMISES.map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-sky-300" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-400">
          Shop or yard? <Link to="/shops" className="font-semibold text-slate-200 hover:text-white">See Bosun for shops →</Link>
        </p>
      </aside>

      {/* Form */}
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="mb-8 text-center lg:hidden">
        <Link to="/" className="inline-flex"><BosunLogo className="h-7" /></Link>
      </div>
      {supabaseMissing && (
        <p className="mb-4 text-xs text-red-600">Supabase keys are missing. Sign-in will not work until they are set.</p>
      )}

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-xl border border-border shadow-card">

        {/* Mode toggle */}
        <div className="flex border-b border-border">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "flex-1 py-3.5 text-sm font-semibold transition-colors",
                mode === m
                  ? "text-foreground border-b-2 border-sky-500 -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {searchParams.get("next") === "/tech" && (
            <p className="text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
              Crew login: use the email your shop invited. New here? Create an account with that email, then sign in.
            </p>
          )}

          {/* Name — signup only */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Full name
              </label>
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-border bg-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Role selector — signup only */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">
                I am a…
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["owner", "vendor"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-sm font-medium transition-colors",
                      role === r
                        ? "border-sky-500 bg-sky-50 text-sky-900"
                        : "border-border text-muted-foreground hover:border-sky-300 hover:text-foreground"
                    )}
                  >
                    {r === "owner" ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                      </svg>
                    )}
                    <span className="text-xs">{r === "owner" ? "Boat Owner" : "Service Vendor"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {success}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          {mode === "signin" && (
            <p className="text-center text-xs text-muted-foreground">
              Just looking?{" "}
              <Link to="/demo" className="font-semibold text-sky-700 hover:underline">Try the demo</Link>, no account needed.
            </p>
          )}
        </form>
      </div>

      {/* Mode switch link */}
      <p className="mt-5 text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>Don't have an account?{" "}
            <button onClick={() => switchMode("signup")} className="font-semibold text-sky-700 hover:underline">
              Sign up
            </button>
          </>
        ) : (
          <>Already have an account?{" "}
            <button onClick={() => switchMode("signin")} className="font-semibold text-sky-700 hover:underline">
              Sign in
            </button>
          </>
        )}
      </p>
      </div>
    </div>
  );
}
