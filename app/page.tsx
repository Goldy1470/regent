import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowDown,
  ReceiptText,
  CreditCard,
  Radar,
  Gavel,
  Lock,
  Check,
  X,
} from "lucide-react";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/types";
import HeroDemo from "@/components/hero-demo";
import RegentMark from "@/components/regent-mark";
import Reveal from "@/components/reveal";

const STATS = [
  {
    label: "TikTok Shop is the channel",
    logo: "/brands/tiktok.svg",
    lines: ["50.3B", "global GMV in H1 2026, +92% YoY - on track past $100B for the year"],
  },
  {
    label: "And it is defended by nobody",
    logo: "/brands/amazon.svg",
    lines: ["12-18%", "return-fraud rate vs 6-8% on Amazon. Zero dispute tooling exists in the stack"],
  },
  {
    label: "Until now",
    lines: ["4 thieves", "strikes, refund fraud, fee overcharges, affiliate gates. One AI for each"],
  },
];

function BrandChip({
  logo,
  label,
  core,
}: {
  logo?: string;
  label: string;
  core?: boolean;
}) {
  return (
    <span
      data-reveal
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
        core
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
      }`}
    >
      {logo && (
        <Image
          src={logo}
          alt=""
          width={16}
          height={16}
          className={core ? "brightness-0 invert" : ""}
        />
      )}
      {label}
      {core && (
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
          core
        </span>
      )}
    </span>
  );
}

const RESEARCH = [
  "Tells you what other sellers win",
  "Flat seat pricing, whatever it saves you",
  "Dashboards to stare at",
  "Scraped estimates as the data layer",
];

const SHIELDED = [
  "Watches YOUR shop and fights for it",
  "Drafts + files every appeal, dispute and correction",
  "Success fee on money actually recovered",
  "First-party API data only - no scraping",
];

function planCard(id: PlanId) {
  const p = PLANS[id];
  return (
    <div
      key={id}
      data-reveal
      className={`relative flex h-full flex-col rounded-2xl border p-7 transition ${
        p.highlight
          ? "border-neutral-900 bg-neutral-950 text-white shadow-[0_24px_60px_-24px_rgba(10,10,10,0.5)]"
          : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-[0_16px_40px_-20px_rgba(10,10,10,0.15)]"
      }`}
    >
      {p.highlight && (
        <span className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-neutral-900 shadow-sm">
          Most sellers start here
        </span>
      )}
      <h3 className={`font-display text-base font-semibold ${p.highlight ? "text-white" : "text-neutral-900"}`}>
        {p.name}
      </h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className={`text-4xl font-semibold tracking-tight ${p.highlight ? "text-white" : "text-neutral-900"}`}>
          ${p.price}
        </span>
        <span className={`text-sm ${p.highlight ? "text-neutral-400" : "text-neutral-400"}`}>/mo</span>
      </div>
      <p className={`mt-1.5 text-[13px] font-medium ${p.highlight ? "text-emerald-400" : "text-emerald-600"}`}>
        + {(p.performanceFee * 100).toFixed(0)}% of funds recovered
      </p>
      <ul className={`mt-6 flex-1 space-y-2.5 text-[13px] leading-relaxed ${p.highlight ? "text-neutral-300" : "text-neutral-500"}`}>
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            {p.highlight ? (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            )}
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-7 inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${
          p.highlight
            ? "bg-white text-neutral-900 hover:bg-neutral-200"
            : "bg-neutral-900 text-white hover:bg-neutral-700"
        }`}
      >
        {p.id === "free" ? "Start free" : `Choose ${p.name}`}
      </Link>
    </div>
  );
}

const FAQ = [
  {
    q: "How is this different from Kalodata, FastMoss or Pipiads?",
    a: "They are research tools - they show what others sell. Regent is a protection tool: it plugs into your own shop, watches what can take your money away (strikes, fraud, fee errors, eligibility gates) and actively fights for it. Research tells you where to aim; the Shield makes sure the revenue actually lands.",
  },
  {
    q: "Why a performance fee on recovered funds?",
    a: "Because we only get paid extra when you do. The subscription keeps the radar running; the recovery fee means every dispute, fee correction and appeal we win is money we split with you. Flat analytics seats price the same whether or not they save you a dollar.",
  },
  {
    q: "Does it connect to my real TikTok Shop?",
    a: "Yes - via TikTok Shop Open API (listing, order, return and settlement endpoints) with read-plus-representative scopes. This build ships in demo mode with a realistic synthetic shop; the live connector is phase 2 after developer approval.",
  },
  {
    q: "What does the AI actually write versus me?",
    a: "The AI drafts - evidence packets, corrected listing copy, appeal narratives - and you approve in one click. Nothing files itself. You keep final approval on anything touching refunds, claims or policy.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <RegentMark className="h-7 w-7 text-neutral-900" />
            <span className="font-display text-[15px] font-semibold tracking-tight">Regent</span>
            <span className="hidden rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-500 sm:inline-flex">
              for TikTok Shop
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-neutral-500 md:flex">
            <a href="#product" className="transition hover:text-neutral-900">Product</a>
            <a href="#difference" className="transition hover:text-neutral-900">The difference</a>
            <a href="#numbers" className="transition hover:text-neutral-900">Numbers</a>
            <a href="#worth" className="transition hover:text-neutral-900">Why pay</a>
            <a href="#pricing" className="transition hover:text-neutral-900">Pricing</a>
            <a href="#faq" className="transition hover:text-neutral-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-neutral-600 transition hover:text-neutral-900">
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden px-6 pb-20 pt-20 md:pt-28">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-50 via-[#fdf9fb] to-transparent" />
          <Reveal className="relative mx-auto max-w-4xl text-center" stagger={0.09}>
            <div data-reveal className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs text-neutral-600 shadow-sm">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-neutral-900 text-[9px] font-bold text-white">N</span>
              New: the Oct-2025 affiliate-eligibility gate is now monitored per SKU
            </div>
            <h1 data-reveal className="font-display mt-7 text-[42px] font-medium leading-[1.06] tracking-[-0.03em] md:text-[64px]">
              One AI agent that fights
              <br />
              <span className="italic text-emerald-600">every fight TikTok picks.</span>
            </h1>
            <p data-reveal className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-neutral-500">
              Violation strikes. Refund fraud. Fee overcharges. The affiliate gate. One agent knows
              all four fights, drafts every packet, and files what you approve.
            </p>
            <div data-reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(10,10,10,0.4)] transition hover:-translate-y-0.5 hover:bg-neutral-700"
              >
                Shield my shop free <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#product"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-7 py-3.5 text-[15px] font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                Watch it work <ArrowDown className="h-4 w-4 text-neutral-400" />
              </a>
            </div>
            <p data-reveal className="mt-5 text-xs text-neutral-400">
              Free tier includes the full radar on a live demo shop. No card. Nothing files without you.
            </p>
          </Reveal>

          <Reveal className="relative mx-auto mt-16 max-w-6xl px-0" delay={0.25}>
            <div data-reveal id="product">
              <HeroDemo />
            </div>
          </Reveal>
        </section>

        {/* ECOSYSTEM BANDS */}
        <section className="border-y border-neutral-100 px-6 py-16">
          <Reveal className="mx-auto flex max-w-4xl flex-col items-center gap-8" stagger={0.05}>
            <div className="text-center">
              <p data-reveal className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Watches where the money flows
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                <BrandChip logo="/brands/tiktok.svg" label="TikTok Shop" core />
                <BrandChip label="Seller Center" />
                <BrandChip label="Open API" />
                <BrandChip label="Webhooks" />
                <BrandChip label="Settlements CSV" />
                <BrandChip label="AHR ledger" />
              </div>
              <p data-reveal className="mt-3 text-xs text-neutral-400">
                One first-party integration. No scraping, no estimated data.
              </p>
            </div>
            <div data-reveal className="h-px w-20 bg-neutral-200" />
            <div className="text-center">
              <p data-reveal className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                Drafts every packet with
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                <BrandChip logo="/brands/claude.svg" label="Claude" />
                <BrandChip logo="/brands/openai.svg" label="ChatGPT" />
                <BrandChip logo="/brands/openai.svg" label="Codex" />
                <BrandChip label="+ whatever you run next" />
              </div>
              <p data-reveal className="mt-3 text-xs text-neutral-400">
                Model-agnostic engine: swap the frontier model, keep the evidence.
              </p>
            </div>
          </Reveal>
        </section>

        {/* TIERED NUMBERS */}
        <section id="numbers" className="border-y border-neutral-100 bg-[#fafafa]">
          <Reveal className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-3 md:gap-0 md:divide-x md:divide-neutral-200">
            {STATS.map((s) => (
              <div key={s.label} data-reveal className="px-2 text-center md:px-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {s.label}
                </p>
                {s.logo && (
                  <Image src={s.logo} alt="" width={24} height={24} className="mx-auto mt-4" />
                )}
                <p className="mt-3 text-4xl font-medium tracking-tight text-neutral-900">{s.lines[0]}</p>
                <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-neutral-500">{s.lines[1]}</p>
              </div>
            ))}
          </Reveal>
        </section>

        {/* BENTO */}
        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-end">
              <div>
                <p data-reveal className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  What Regent does
                </p>
                <h2 data-reveal className="font-display mt-3 text-4xl font-medium tracking-[-0.02em] md:text-5xl">
                  Less dashboards.
                  <br />
                  <span className="text-neutral-400">More defended payouts.</span>
                </h2>
              </div>
              <p data-reveal className="text-[15px] leading-relaxed text-neutral-500 md:pl-10">
                Every high-impact action stays yours to approve. The Shield scans, drafts, stacks
                evidence and files - across all four money leaks, day and night.
              </p>
            </div>

            <Reveal className="mt-12 grid gap-5 lg:grid-cols-2" stagger={0.12}>
              {/* Big card: violation fighter */}
              <div data-reveal className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 p-8 transition hover:border-neutral-300 lg:row-span-2">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-50 blur-3xl" />
                <div className="relative">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <Gavel className="h-5 w-5 text-neutral-900" />
                  </span>
                  <h3 className="font-display mt-5 text-2xl font-medium tracking-tight">Fights violations</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
                    Pre-publish scans against the claims corpus, then appeal packets for the strikes
                    that still land. AHR points sit 180 days - each one needs its own fight. We fight them.
                  </p>
                </div>
                <div className="relative mt-8 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
                    <span className="grid h-5 w-5 place-items-center rounded bg-neutral-900">
                      <RegentMark className="h-3 w-3 text-white" />
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">appeal: CG-2411</span>
                    <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      packet ready
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-[13px] leading-relaxed">
                    <p className="text-neutral-700">
                      <span className="font-semibold text-rose-600 line-through decoration-rose-300">
                        Fades acne scars in 7 days
                      </span>{" "}
                      <span className="text-neutral-400">{"->"}</span> &quot;visibly smooths the look of texture
                      over time&quot;
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-medium">
                      {["Corrected copy", "Cert PDF refs", "48h commitment"].map((c) => (
                        <span key={c} className="flex items-center gap-1 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 text-neutral-600">
                          <Check className="h-2.5 w-2.5 text-emerald-600" /> {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fraud scorer */}
              <div data-reveal className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-neutral-300">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <ReceiptText className="h-5 w-5 text-neutral-900" />
                </span>
                <h3 className="font-display mt-4 text-xl font-medium tracking-tight">Scores every refund claim</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                  Buyer history + carrier scans + your listing proof, folded into one fraud score.
                </p>
                <div className="mt-5 space-y-2">
                  {[
                    { o: "TT-88210", s: 92, c: "bg-rose-500" },
                    { o: "TT-87931", s: 78, c: "bg-amber-400" },
                    { o: "TT-87910", s: 96, c: "bg-rose-600" },
                  ].map((r) => (
                    <div key={r.o} className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                      <span className="font-mono text-[11px] text-neutral-500">{r.o}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
                        <div className={`h-full rounded-full ${r.c}`} style={{ width: `${r.s}%` }} />
                      </div>
                      <span className="font-mono text-xs font-semibold text-neutral-900">{r.s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee auditor */}
              <div data-reveal className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-neutral-300">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-sm">
                  <CreditCard className="h-5 w-5 text-neutral-900" />
                </span>
                <h3 className="font-display mt-4 text-xl font-medium tracking-tight">Reclaims fee overcharges</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                  Settlement lines vs the published rate card, every cycle. The errors TikTok calls
                  &quot;impossible to amend&quot; get amended.
                </p>
                <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 font-mono text-[11px] text-neutral-600">
                  <div className="flex justify-between"><span>Return admin. fee cap</span><span>$5.00</span></div>
                  <div className="flex justify-between text-rose-600"><span className="line-through">charged</span><span>$9.99</span></div>
                  <div className="mt-1.5 flex justify-between border-t border-neutral-200 pt-1.5 font-semibold text-emerald-700">
                    <span>batch overcharge found</span><span>+$154.69</span>
                  </div>
                </div>
              </div>

              {/* SFRR Guardian */}
              <div data-reveal className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-7 transition hover:border-neutral-300 lg:col-span-2 lg:flex lg:items-center lg:gap-10">
                <div className="max-w-sm">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <Radar className="h-5 w-5 text-neutral-900" />
                  </span>
                  <h3 className="font-display mt-4 text-xl font-medium tracking-tight">Guards the affiliate gate</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
                    Since Oct 2025, TikTok suspends affiliate access on the Seller-Fault Return Rate
                    per SKU. 71% of US revenue is affiliate-attributed. We watch the gate and hand you
                    the fix that pulls each SKU back in.
                  </p>
                </div>
                <div className="mt-6 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 p-4 lg:mt-0">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { n: "Velvet Matte Lipstick", sfrr: 11.8, th: 4.0, bad: true },
                      { n: "Sky Matte Brush Set", sfrr: 3.1, th: 4.0, bad: false },
                      { n: "Rose Glow Serum", sfrr: 6.9, th: 4.0, bad: true },
                      { n: "Sundown Palette", sfrr: 1.9, th: 6.0, bad: false },
                    ].map((p) => (
                      <div key={p.n} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5">
                        <div>
                          <p className="text-[12px] font-semibold text-neutral-900">{p.n}</p>
                          <p className="font-mono text-[10px] text-neutral-400">
                            SFRR <span className={p.bad ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>{p.sfrr}%</span>
                            {" / "}{p.th}% gate
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.bad ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
                          {p.bad ? "blocked" : "eligible"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* DIFFERENCE */}
        <section id="difference" className="px-6 py-24">
          <div className="mx-auto max-w-5xl text-center">
            <p data-reveal className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              The difference
            </p>
            <h2 data-reveal className="font-display mx-auto mt-3 max-w-2xl text-4xl font-medium tracking-[-0.02em] md:text-5xl">
              Other tools point at charts.
              <br />
              <span className="text-neutral-400">This one does the work.</span>
            </h2>
            <Reveal className="mt-12 grid gap-5 md:grid-cols-2" stagger={0.12}>
              <div data-reveal className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-left">
                <p className="text-sm font-semibold text-neutral-500">Research & analytics tools</p>
                <ul className="mt-5 space-y-3.5">
                  {RESEARCH.map((r) => (
                    <li key={r} className="flex items-start gap-3 text-[14px] text-neutral-500">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-reveal className="relative overflow-hidden rounded-2xl border border-neutral-900 bg-white p-8 text-left shadow-[0_20px_60px_-24px_rgba(10,10,10,0.25)]">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-50 blur-3xl" />
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <RegentMark className="h-4 w-4 text-neutral-900" /> Regent
                </p>
                <ul className="mt-5 space-y-3.5">
                  {SHIELDED.map((r) => (
                    <li key={r} className="flex items-start gap-3 text-[14px] text-neutral-800">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* HOW */}
        <section className="border-y border-neutral-100 bg-[#fafafa] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 data-reveal className="font-display font-display text-center text-4xl font-medium tracking-[-0.02em]">
              Connect an agent <span className="italic text-emerald-600">this afternoon.</span>
            </h2>
            <p data-reveal className="mx-auto mt-4 max-w-md text-center text-[15px] text-neutral-500">
              Three steps. Every packet lands paused for your approval.
            </p>
            <Reveal className="mt-14 grid gap-5 md:grid-cols-3" stagger={0.12}>
              {[
                { n: "01", t: "Connect", d: "Sign up, name your shop. The Shield pre-loads a full synthetic prod of your category so every module is live and testable in minutes." },
                { n: "02", t: "The radar sweeps", d: "Open violations, refund claims, settlement lines and SKU gates get scored, ranked and packeted. Your true attack surface, visible in minutes." },
                { n: "03", t: "You approve, it files", d: "One click per packet into Seller Center. Every dollar recovered lands in an auditable ledger - we invoice a small success fee on it." },
              ].map((s) => (
                <div key={s.n} data-reveal className="relative rounded-2xl border border-neutral-200 bg-white p-8 transition hover:border-neutral-300 hover:shadow-[0_16px_40px_-20px_rgba(10,10,10,0.15)]">
                  <span className="font-mono text-[64px] font-semibold leading-none tracking-tighter text-neutral-100">
                    {s.n}
                  </span>
                  <h3 className="font-display mt-3 text-xl font-medium tracking-tight">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s.d}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* WHY PAY */}
        <section id="worth" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p data-reveal className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                The justification
              </p>
              <h2 data-reveal className="font-display mx-auto mt-3 max-w-3xl text-4xl font-medium tracking-[-0.02em] md:text-5xl">
                TikTok keeps every dollar
                <br />
                <span className="italic text-emerald-600">you don&apos;t fight for.</span>
              </h2>
              <p data-reveal className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-500">
                Appeals, disputes and audits are just bookkeeping you don&apos;t have time for.
                Regent does the bookkeeping and shares the upside.
              </p>
            </div>

            <Reveal className="mt-12 grid gap-5 md:grid-cols-2" stagger={0.12}>
              <div data-reveal className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
                <p className="text-sm font-semibold text-neutral-500">What the leaks cost you</p>
                <ul className="mt-5 space-y-3.5 text-[14px] text-neutral-500">
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span><span className="font-semibold text-neutral-900">12-18% of payouts</span> eaten by return fraud you never dispute</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span><span className="font-semibold text-neutral-900">180 days idle</span> per unfought AHR strike - a $6k/mo listing just stops</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span><span className="font-semibold text-neutral-900">Fee overcharges repeat</span> every settlement cycle until someone audits</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span><span className="font-semibold text-neutral-900">Lose the 4% SFRR gate</span> and the 71% of revenue from affiliates goes dark</span>
                  </li>
                </ul>
              </div>
              <div data-reveal className="relative overflow-hidden rounded-2xl border border-neutral-900 bg-white p-8 shadow-[0_20px_60px_-24px_rgba(10,10,10,0.25)]">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-50 blur-3xl" />
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <RegentMark className="h-4 w-4 text-neutral-900" /> What Regent charges
                </p>
                <ul className="mt-5 space-y-3.5 text-[14px] text-neutral-800">
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span><span className="font-semibold">$0 free tier</span> - the radar runs before you pay a cent</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span><span className="font-semibold">Ward is $19/mo</span> - breakeven at roughly $160 recovered, once</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span><span className="font-semibold">Success fee only on money back</span> - no recovery, no fee</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span><span className="font-semibold">An ops hire runs $3-5k/mo</span> - this runs 24/7 from $19</span>
                  </li>
                </ul>
              </div>
            </Reveal>
            <p data-reveal className="mx-auto mt-8 max-w-2xl text-center text-neutral-400">
              The subscription buys the radar. The success fee buys nothing but wins.
            </p>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 data-reveal className="font-display font-display text-center text-4xl font-medium tracking-[-0.02em] md:text-5xl">
              Subscription + success fee.
              <br />
              <span className="italic text-emerald-600">We win when you win.</span>
            </h2>
            <Reveal className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
              {(["free", "starter", "scale", "pro"] as PlanId[]).map(planCard)}
            </Reveal>
            <p data-reveal className="mx-auto mt-8 max-w-xl text-center text-xs leading-relaxed text-neutral-400">
              No seat tax: the subscription only buys the radar. The success fee applies to nothing
              but funds actually recovered through filed disputes, fee corrections and reinstated
              listings - invoiced monthly from a ledger you can audit line by line. Cancel anytime.
            </p>
          </div>
        </section>

        {/* QUOTE */}
        <section className="px-6 pb-10">
          <Reveal className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-[#fafafa] p-10 text-center">
            <p data-reveal className="font-display text-[22px] leading-relaxed tracking-normal text-neutral-800">
              &quot;If you run TikTok Shop as a primary channel with five or six affiliates, you are one
              sloppy claim batch away from a revenue cliff. Defend operations before you scale them.&quot;
            </p>
            <p data-reveal className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Marketplace ops lead - growth agency, live citation in our research file
            </p>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <h2 data-reveal className="font-display font-display text-center text-4xl font-medium tracking-[-0.02em]">Straight answers</h2>
            <Reveal className="mt-10 divide-y divide-neutral-100 border-y border-neutral-100" stagger={0.07}>
              {FAQ.map((f) => (
                <details key={f.q} data-reveal className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-neutral-900">
                    {f.q}
                    <Plus />
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">{f.a}</p>
                </details>
              ))}
            </Reveal>
            <Reveal className="mt-14 rounded-2xl bg-neutral-950 p-12 text-center" stagger={0.08}>
              <h3 data-reveal className="font-display text-3xl tracking-normal text-white">
                The money is leaking right now.
              </h3>
              <p data-reveal className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
                Free tier - full radar, live demo shop, zero card. Five minutes to know whether this
                belongs next to Kalodata.
              </p>
              <Link
                data-reveal
                href="/signup"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-medium text-neutral-900 transition hover:bg-neutral-200"
              >
                Create my shield <ArrowRight className="h-4 w-4" />
              </Link>
              <p data-reveal className="mt-4 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
                <Lock className="h-3 w-3" /> AI drafts. You approve. Nothing files itself.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-100 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-sm text-neutral-500 md:flex-row">
          <div className="flex items-center gap-2">
            <RegentMark className="h-6 w-6 text-neutral-900" />
            <span className="font-display font-semibold text-neutral-900">Regent</span>
            <span className="text-neutral-300">2026</span>
          </div>
          <p className="max-w-md text-center text-xs leading-relaxed text-neutral-400 md:text-right">
            Decision support, not legal or financial advice. Evidence packets and copy are AI-drafted;
            a human approves every filing. Estimates are labeled; first-party data decides.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Plus() {
  return (
    <span className="relative h-3.5 w-3.5 shrink-0 text-neutral-400 transition group-open:rotate-45">
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current" />
    </span>
  );
}
