"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { planLabel } from "@/lib/plans";
import type { Profile, Shop } from "@/lib/types";
import RegentMark from "./regent-mark";
import {
  ShieldCheck,
  LayoutDashboard,
  ScanSearch,
  ReceiptText,
  CreditCard,
  Radar,
  Wallet,
  LogOut,
  Menu,
  X,
  Settings,
  Bell,
  FlaskConical,
  ChevronDown,
  BadgeCheck,
} from "lucide-react";

const NAV_GROUPS: {
  group: string;
  items: { href: string; label: string; icon: typeof ShieldCheck }[];
}[] = [
  {
    group: "Console",
    items: [{ href: "/app/dashboard", label: "Command center", icon: LayoutDashboard }],
  },
  {
    group: "Shield",
    items: [
      { href: "/app/violations", label: "Violation Shield", icon: ScanSearch },
      { href: "/app/scan", label: "Listing Scanner", icon: ShieldCheck },
      { href: "/app/sfrr", label: "SFRR Guardian", icon: Radar },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/app/returns", label: "Return Fraud Fighter", icon: ReceiptText },
      { href: "/app/fees", label: "Fee Auditor", icon: CreditCard },
      { href: "/app/recovery", label: "Recovery Wallet", icon: Wallet },
    ],
  },
];

export default function Shell({
  profile,
  shop,
  criticalAlerts,
  children,
}: {
  profile: Profile;
  shop: Shop;
  criticalAlerts: { id: string; title: string; severity: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setBellOpen(false);
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = (profile.full_name?.trim()?.[0] ?? "S").toUpperCase();
  const paid = profile.plan !== "free";
  const recoveredDisplay =
    Number(profile.recovered_lifetime) >= 1000
      ? `$${(Number(profile.recovered_lifetime) / 1000).toFixed(1)}k`
      : `$${Number(profile.recovered_lifetime).toFixed(0)}`;

  return (
    <div className="min-h-screen bg-ink-950 lg:grid lg:grid-cols-[264px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-white/[0.06] bg-ink-900/95 backdrop-blur transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-volt-500 to-volt-600 shadow-glow">
              <RegentMark className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="text-[15px] font-bold leading-tight tracking-tight">Regent</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                protection console
              </p>
            </div>
          </Link>
          <button className="text-zinc-500 lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4">
          <div className="panel p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-mint-400">
              <FlaskConical className="h-3 w-3" />
              {shop.mode === "demo" ? "Demo shop — synthetic feed" : "Live TikTok Shop"}
            </div>
            <p className="mt-1.5 truncate font-semibold">{shop.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
              ${(shop.monthly_gmv || 0).toLocaleString()} GMV/mo · {shop.region}
            </p>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {NAV_GROUPS.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                {g.group}
              </p>
              <div className="space-y-1">
                {g.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition ${
                        active
                          ? "bg-volt-500/[0.13] text-white shadow-[inset_2px_0_0_0_theme(colors.volt.500)]"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 transition ${active ? "text-volt-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2.5 border-t border-white/[0.06] p-4">
          <Link
            href="/app/settings"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition ${
              pathname === "/app/settings"
                ? "bg-volt-500/[0.13] text-white"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
            }`}
          >
            <Settings className="h-4 w-4 text-zinc-500" /> Settings
          </Link>
          <Link href="/app/billing" onClick={() => setOpen(false)} className="panel block p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{planLabel(profile.plan)} plan</p>
                <p
                  className={`text-[11px] ${
                    profile.subscription_status === "active" ? "text-mint-400" : "text-zinc-500"
                  }`}
                >
                  {profile.subscription_status === "active"
                    ? "Active subscription"
                    : profile.subscription_status === "past_due"
                      ? "Payment failed"
                      : "Free tier"}
                </p>
              </div>
              {paid ? (
                <BadgeCheck className="h-5 w-5 text-mint-500" />
              ) : (
                <span className="chip border-volt-500/25 bg-volt-500/[0.08] text-volt-400">Upgrade</span>
              )}
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-950/85 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="text-zinc-300 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden font-bold lg:block">{shop.name}<span className="text-zinc-700"> / </span><span className="text-zinc-400">shield console</span></span>
          </div>

          <div ref={menuRef} className="flex items-center gap-2.5">
            <span className="chip border-mint-400/25 bg-mint-500/[0.08] text-mint-400">
              <span className="ping-dot bg-mint-500" />
              {recoveredDisplay} recovered
            </span>

            <div className="relative">
              <button
                onClick={() => {
                  setBellOpen((v) => !v);
                  setUserOpen(false);
                }}
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:text-white"
              >
                <Bell className="h-4 w-4" />
                {criticalAlerts.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                    {criticalAlerts.length}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="panel-glass absolute right-0 z-50 mt-2 w-80 p-2">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    Enforcement radar
                  </p>
                  {criticalAlerts.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-zinc-500">All clear — no critical events.</p>
                  ) : (
                    criticalAlerts.map((a) => (
                      <Link
                        key={a.id}
                        href="/app/violations"
                        onClick={() => setBellOpen(false)}
                        className="block rounded-xl px-3 py-2.5 text-xs transition hover:bg-white/[0.05]"
                      >
                        <span className="chip border-rose-500/25 bg-rose-500/10 text-rose-300">
                          {a.severity}
                        </span>
                        <p className="mt-1.5 leading-snug text-zinc-200">{a.title}</p>
                      </Link>
                    ))
                  )}
                  <Link
                    href="/app/violations"
                    onClick={() => setBellOpen(false)}
                    className="block border-t border-white/[0.06] px-3 py-2.5 text-center text-[11px] font-semibold text-volt-400 hover:text-volt-500"
                  >
                    Open Violation Shield →
                  </Link>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setUserOpen((v) => !v);
                  setBellOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 transition hover:border-volt-500/40"
              >
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-volt-600 text-[11px] font-bold text-white">
                  {initial}
                </span>
                <span className="hidden text-xs font-semibold text-zinc-200 sm:block">
                  {profile.full_name.length > 18 ? `${profile.full_name.slice(0, 18)}…` : profile.full_name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              </button>
              {userOpen && (
                <div className="panel-glass absolute right-0 z-50 mt-2 w-56 p-1.5">
                  <p className="px-3 py-2 text-xs text-zinc-500">{profile.email}</p>
                  <Link
                    href="/app/settings"
                    onClick={() => setUserOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-200 hover:bg-white/[0.05]"
                  >
                    <Settings className="h-3.5 w-3.5" /> Shop & profile settings
                  </Link>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-zinc-200 hover:bg-white/[0.05]"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-6xl px-5 py-9 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
