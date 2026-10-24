"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import RegentMark from "./regent-mark";
import {

  Loader2,
  Mail,
  Lock,
  User,
  AlertTriangle,
  Gavel,
  ReceiptText,
  CreditCard,
  Radar,
  ArrowRight,
} from "lucide-react";

type Mode = "login" | "signup";

const BULLETS = [
  { icon: Gavel, text: "Appeal packets for strikes & AHR points — drafted, not blanked" },
  { icon: ReceiptText, text: "Fraud-scored refund claims with evidence bundles" },
  { icon: CreditCard, text: "Settlement audit that finds overcharged fees" },
  { icon: Radar, text: "Per-SKU affiliate-eligibility radar (the Oct-25 rule)" },
];

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    const supabase = createClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart."
      );
      setBusy(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || "Founder" },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/app/onboarding");
          router.refresh();
        } else {
          setNotice(
            "Account created. If this project requires email confirmation, check your inbox — then log in."
          );
          setBusy(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/app/dashboard");
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message.includes("Email not confirmed")
          ? "Check your inbox: this project requires email confirmation before you can log in."
          : message
      );
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* Left: value rail */}
      <div className="hero-grid relative hidden flex-col justify-between p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-volt-500 to-volt-600 shadow-glow">
            <RegentMark className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight">Regent</span>
        </Link>

        <div>
          <h2 className="animate-fade-up max-w-md text-4xl font-extrabold leading-[1.1] tracking-tight">
            Your shop makes sales.
            <br />
            <span className="text-gradient">We make sure they stay yours.</span>
          </h2>
          <p className="animate-fade-up delay-1 mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
            The four thieves — strikes, refund fraud, fee errors, affiliate gates — eat 20–30% of
            seller GMV. Nobody built the fight-back layer. Until now.
          </p>
          <div className="animate-fade-up delay-2 mt-8 space-y-3.5">
            {BULLETS.map((b) => (
              <div key={b.text} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/10">
                  <b.icon className="h-4 w-4 text-volt-400" />
                </span>
                {b.text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-600">
          AI drafts · you approve every filing · success-fee pricing aligned with your recovery
        </p>
      </div>

      {/* Right: form */}
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2.5 text-zinc-300 transition hover:text-white lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-volt-600 shadow-glow">
              <RegentMark className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-tight">Regent</span>
          </Link>

          <div className="panel-glass p-8">
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold tracking-tight">
                {mode === "login" ? "Welcome back" : "Protect your shop"}
              </h1>
              <p className="mt-1.5 text-sm text-zinc-400">
                {mode === "login"
                  ? "Log in to your radar, dispute autopilot and recovery ledger."
                  : "Create your account — first shop connects in ~15 seconds."}
              </p>
            </div>
            <h1 className="hidden text-lg font-bold text-zinc-300 lg:block">
              {mode === "login" ? "Log in to your console" : "Start your free tier"}
            </h1>

            <form onSubmit={handleSubmit} className={mode === "signup" ? "mt-6 space-y-4" : "mt-6 space-y-4"}>
              {mode === "signup" && (
                <div>
                  <label className="label" htmlFor="name">Founder / brand name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      id="name"
                      className="input pl-10"
                      placeholder="Alex from Aurea Beauty Lab"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label" htmlFor="email">Work email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    id="email"
                    type="email"
                    required
                    className="input pl-10"
                    placeholder="seller@brand.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    className="input pl-10"
                    placeholder="6+ characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-sm text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-xl border border-mint-400/20 bg-mint-500/[0.07] p-3 text-sm text-mint-400">
                  {notice}
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? "Log in" : "Free tier — no card required"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-400">
              {mode === "login" ? (
                <>
                  New to Regent?{" "}
                  <Link href="/signup" className="font-medium text-volt-400 hover:text-volt-500">
                    Create an account <ArrowRight className="inline h-3 w-3" />
                  </Link>
                </>
              ) : (
                <>
                  Already shielding a shop?{" "}
                  <Link href="/login" className="font-medium text-volt-400 hover:text-volt-500">
                    Log in <ArrowRight className="inline h-3 w-3" />
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
