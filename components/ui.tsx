import { Children, type ReactNode } from "react";
import { LEVEL_LABEL, levelOf, type RiskLevel } from "@/lib/risk";

export function PageTitle({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Card({ title, children, className = "", right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-xl border border-ink-100 bg-white p-5 shadow-sm ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

const TONE = {
  plain: "text-ink-900",
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-red-600",
};

export function Stat({ label, value, hint, tone = "plain", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: keyof typeof TONE; href?: string }) {
  const body = (
    <>
      <div className="text-xs font-medium text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${TONE[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </>
  );
  const cls = "block rounded-xl border border-ink-100 bg-white p-4 shadow-sm";
  return href ? <a href={href} className={`${cls} hover:border-brand-400`}>{body}</a> : <div className={cls}>{body}</div>;
}

export function Table({ head, children, align, empty = "Yozuv yo'q" }: { head: string[]; children: ReactNode; align?: ("l" | "r" | "c")[]; empty?: string }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
            {head.map((h, i) => (
              <th key={h + i} className={`px-5 py-2 font-medium ${align?.[i] === "r" ? "text-right" : align?.[i] === "c" ? "text-center" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 [&_td]:px-5 [&_td]:py-2.5 [&_td]:align-top">
          {rows.length ? rows : (
            <tr>
              <td colSpan={head.length} className="py-8 text-center text-ink-500">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export const LEVEL_STYLE: Record<RiskLevel, { badge: string; ring: string; bar: string }> = {
  past: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", ring: "#059669", bar: "bg-emerald-500" },
  orta: { badge: "bg-amber-50 text-amber-800 ring-amber-200", ring: "#d97706", bar: "bg-amber-500" },
  yuqori: { badge: "bg-orange-50 text-orange-800 ring-orange-200", ring: "#ea580c", bar: "bg-orange-500" },
  kritik: { badge: "bg-red-50 text-red-700 ring-red-200", ring: "#dc2626", bar: "bg-red-600" },
};

export function RiskBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-ink-500">hisoblanmagan</span>;
  const lv = levelOf(score);
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset tabular-nums ${LEVEL_STYLE[lv].badge}`}>
      {score} · {LEVEL_LABEL[lv]}
    </span>
  );
}

/** Doira shaklidagi risk ko'rsatkichi (kutubxonasiz SVG) */
export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const lv = levelOf(score);
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`Risk balli ${score} — ${LEVEL_LABEL[lv]}`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#eef0f3" strokeWidth="12" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={LEVEL_STYLE[lv].ring} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="700" fill="#151a23">{score}</text>
      <text x="60" y="78" textAnchor="middle" fontSize="11" fill="#5c6573">{LEVEL_LABEL[lv]} risk</text>
    </svg>
  );
}

/** Risk tarixi: oddiy chiziqli grafik */
export function Sparkline({ points, height = 60 }: { points: { sana: string; ball: number }[]; height?: number }) {
  if (points.length < 2) return <p className="text-xs text-ink-500">Tarix hali yig&apos;ilmagan — har kuni yangilanadi.</p>;
  const w = 300;
  const step = w / (points.length - 1);
  const y = (b: number) => height - 4 - (b / 100) * (height - 8);
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(p.ball).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-16 w-full" preserveAspectRatio="none" role="img" aria-label={`Risk tarixi, oxirgi qiymat ${last.ball}`}>
      <line x1="0" x2={w} y1={y(50)} y2={y(50)} stroke="#eef0f3" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="#2856c4" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" | "bad" | "info" }) {
  const t = {
    plain: "bg-ink-100 text-ink-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-800",
    bad: "bg-red-50 text-red-700",
    info: "bg-brand-50 text-brand-700",
  }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function Field({ label, name, type = "text", defaultValue, required, placeholder, hint, step }: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string; hint?: string; step?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}{required && <span className="text-red-600"> *</span>}</label>
      <input id={name} name={name} type={type} className="input" defaultValue={defaultValue ?? undefined} required={required} placeholder={placeholder} step={step} />
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function Select({ label, name, options, defaultValue, required }: { label: string; name: string; options: [string, string][]; defaultValue?: string | null; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} className="input" defaultValue={defaultValue ?? undefined} required={required}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

/** Ochiladigan forma bloki (JS'siz) */
export function AddBox({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="mb-6 rounded-xl border border-dashed border-brand-400 bg-white p-4 [&_summary]:cursor-pointer" open={open}>
      <summary className="text-sm font-medium text-brand-700">＋ {title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function Notice({ kind = "ok", children }: { kind?: "ok" | "err"; children: ReactNode }) {
  return (
    <p role={kind === "err" ? "alert" : "status"} className={`mb-4 rounded-lg p-3 text-sm ${kind === "err" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
      {children}
    </p>
  );
}
