import type { ReactNode } from "react";

const TONES: Record<string, string> = {
  critical: "border-rose-500/25 bg-rose-500/[0.08] text-rose-300",
  high: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300",
  medium: "border-sky-500/25 bg-sky-500/[0.08] text-sky-300",
  low: "border-white/10 bg-white/[0.04] text-zinc-400",
  ok: "border-mint-400/25 bg-mint-500/[0.08] text-mint-400",
  volt: "border-volt-500/25 bg-volt-500/[0.08] text-volt-400",
};

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof TONES | string;
  children: ReactNode;
}) {
  return <span className={`chip ${TONES[tone] ?? TONES.low}`}>{children}</span>;
}

export function statusTone(status: string): string {
  switch (status) {
    case "open":
    case "new":
    case "pending":
      return "high";
    case "appealing":
    case "disputed":
    case "filed":
    case "past_due":
      return "volt";
    case "resolved":
    case "recovered":
    case "active":
      return "ok";
    case "cancelled":
    case "lost":
      return "critical";
    default:
      return "low";
  }
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "volt",
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES | string;
  accent?: boolean;
}) {
  return (
    <div className={`panel panel-hover relative overflow-hidden p-6 ${accent ? "border-volt-500/30" : ""}`}>
      {accent && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-volt-600/20 blur-2xl" />
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">{label}</p>
        {icon && (
          <span className={`grid h-9 w-9 place-items-center rounded-xl chip ${TONES[tone] ?? TONES.low}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-3xl font-extrabold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{sub}</p>}
    </div>
  );
}

export function PageHeader({
  crumb,
  title,
  sub,
  right,
  live = false,
  pulse = false,
  pulseLabel,
}: {
  crumb: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  live?: boolean;
  pulse?: boolean;
  pulseLabel?: string;
}) {
  return (
    <div className="animate-fade-up mb-7">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
        <span>Shield console</span>
        <span className="text-zinc-700">/</span>
        <span className="text-volt-400">{crumb}</span>
        {live && (
          <span className="ml-2 inline-flex items-center gap-1.5">
            <span className="ping-dot bg-mint-500" />
            <span className="text-[10px] tracking-wider text-mint-400">{pulseLabel ?? "live sync"}</span>
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
          {sub && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-500">{sub}</p>}
        </div>
        {right}
      </div>
      {pulse && (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-700">
          {pulseLabel}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-zinc-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function RiskGauge({
  score,
  size = 150,
  label = "suspension risk",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const r = size / 2 - 12;
  const c = size / 2;
  const circumference = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const color = score >= 60 ? "#f43f5e" : score >= 35 ? "#f59e0b" : "#34d399";
  return (
    <div className="relative" style={{ width: size, height: size / 2 + 34 }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <path
          d={`M 12 ${c - r + 12} A ${r} ${r} 0 0 1 ${size - 12} ${c - r + 12}`}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M 12 ${c - r + 12} A ${r} ${r} 0 0 1 ${size - 12} ${c - r + 12}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color }}>
          {score}
          <span className="text-sm font-semibold text-zinc-500">/100</span>
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon?: ReactNode;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 p-14 text-center">
      {icon}
      <p className="font-semibold text-zinc-200">{title}</p>
      {sub && <p className="max-w-sm text-sm leading-relaxed text-zinc-500">{sub}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function Sparkline({
  data,
  width = 120,
  height = 36,
  danger = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  danger?: boolean;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (width - 4) + 2;
      const y = height - 4 - ((v - min) / span) * (height - 10);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = pts.split(" ").slice(-1)[0].split(",");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${danger ? "d" : "m"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={danger ? "rgba(244,63,94,0.25)" : "rgba(52,211,153,0.25)"} />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
      <polygon points={`2,${height} ${pts} ${width - 2},${height}`} fill={`url(#sg-${danger ? "d" : "m"})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={danger ? "#f43f5e" : "#34d399"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill={danger ? "#f43f5e" : "#34d399"} />
    </svg>
  );
}

export function MeterBar({
  value,
  max,
  color = "bg-volt-500",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
