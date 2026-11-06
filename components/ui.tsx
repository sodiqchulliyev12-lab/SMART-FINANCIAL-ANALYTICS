import { Children, type ReactNode } from "react";
import { getT, type T } from "@/lib/i18n";
import { NAV_LABELS } from "@/lib/nav";
import { levelLabel, levelOf, type RiskLevel } from "@/lib/risk";

// Komponentlar matnli prop'larni (sarlavha, yorliq, izoh) o'zi tarjima qiladi: sahifalarda o'zbekcha yozish kifoya.
const tr = (t: T, v: ReactNode) => (typeof v === "string" ? t(v) : v);

export async function PageTitle({ title, sub, right, section }: { title: string; sub?: ReactNode; right?: ReactNode; section?: boolean }) {
  const t = await getT();
  // Bo'lim nomi tepa qatorda turadi: bu yerda takrorlamaymiz, faqat izoh va tugmalar qoladi.
  if (section || NAV_LABELS.has(title)) {
    return (
      <>
        <h1 className="sr-only">{t(title)}</h1>
        {(sub || right) && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {sub ? <p className="text-sm text-ink-500">{tr(t, sub)}</p> : <span />}
            {right}
          </div>
        )}
      </>
    );
  }
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{t(title)}</h1>
        {sub && <p className="mt-1 text-sm text-ink-500">{tr(t, sub)}</p>}
      </div>
      {right}
    </div>
  );
}

export async function Card({ title, children, className = "", right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  const t = await getT();
  return (
    <section className={`min-w-0 rounded-xl border border-ink-100 bg-surface p-5 shadow-sm ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-ink-900">{t(title)}</h2>}
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

export async function Stat({ label, value, hint, tone = "plain", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: keyof typeof TONE; href?: string }) {
  const t = await getT();
  const body = (
    <>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-ink-500">{t(label)}</div>
        {hint && <div className="mt-0.5 truncate text-[11px] text-ink-500">{tr(t, hint)}</div>}
      </div>
      <div className={`shrink-0 text-xl font-semibold tabular-nums ${TONE[tone]}`}>{value}</div>
    </>
  );
  const cls = "flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-surface px-4 py-3 shadow-sm";
  return href ? <a href={href} className={`${cls} hover:border-brand-400`}>{body}</a> : <div className={cls}>{body}</div>;
}

export async function Table({ head, children, align, empty = "Yozuv yo'q" }: { head: string[]; children: ReactNode; align?: ("l" | "r" | "c")[]; empty?: string }) {
  const t = await getT();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
            {head.map((h, i) => (
              <th key={h + i} className={`px-5 py-2 font-medium ${align?.[i] === "r" ? "text-right" : align?.[i] === "c" ? "text-center" : ""}`}>{t(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 [&_td]:px-5 [&_td]:py-2.5 [&_td]:align-top">
          {rows.length ? rows : (
            <tr>
              <td colSpan={head.length} className="py-8 text-center text-ink-500">{t(empty)}</td>
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

export async function RiskBadge({ score }: { score: number | null }) {
  const t = await getT();
  if (score === null || score === undefined) return <span className="text-xs text-ink-500">{t("hisoblanmagan")}</span>;
  const lv = levelOf(score);
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset tabular-nums ${LEVEL_STYLE[lv].badge}`}>
      {score} · {levelLabel(lv, t.lang)}
    </span>
  );
}

/** Doira shaklidagi risk ko'rsatkichi (kutubxonasiz SVG) */
export async function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const t = await getT();
  const lv = levelOf(score);
  const label = t.lang === "ru" ? `${levelLabel(lv, "ru").toLowerCase()} риск` : `${levelLabel(lv, "uz")} risk`;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${t("Risk balli")} ${score} — ${label}`}>
      <circle cx="60" cy="60" r={r} fill="none" className="stroke-ink-100" strokeWidth="12" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={LEVEL_STYLE[lv].ring} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="700" className="fill-ink-900">{score}</text>
      <text x="60" y="78" textAnchor="middle" fontSize="11" className="fill-ink-500">{label}</text>
    </svg>
  );
}

/** Risk tarixi: oddiy chiziqli grafik */
export async function Sparkline({ points, height = 60 }: { points: { sana: string; ball: number }[]; height?: number }) {
  const t = await getT();
  if (points.length < 2) return <p className="text-xs text-ink-500">{t("Tarix hali yig'ilmagan — har kuni yangilanadi.")}</p>;
  const w = 300;
  const step = w / (points.length - 1);
  const y = (b: number) => height - 4 - (b / 100) * (height - 8);
  const d = points.map((p, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(p.ball).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-16 w-full" preserveAspectRatio="none" role="img" aria-label={`${t("Risk tarixi")}: ${last.ball}`}>
      <line x1="0" x2={w} y1={y(50)} y2={y(50)} className="stroke-ink-100" strokeDasharray="4 4" />
      <path d={d} fill="none" className="stroke-brand-600" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export async function Pill({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "good" | "warn" | "bad" | "info" }) {
  const tt = await getT();
  const t = {
    plain: "bg-ink-100 text-ink-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-800",
    bad: "bg-red-50 text-red-700",
    info: "bg-brand-50 text-brand-700",
  }[tone];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${t}`}>{tr(tt, children)}</span>;
}

export async function Field({ label, name, type = "text", defaultValue, required, placeholder, hint, step }: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string; hint?: string; step?: string;
}) {
  const t = await getT();
  return (
    <div>
      <label className="label" htmlFor={name}>{t(label)}{required && <span className="text-red-600"> *</span>}</label>
      <input id={name} name={name} type={type} className="input" defaultValue={defaultValue ?? undefined} required={required} placeholder={placeholder ? t(placeholder) : undefined} step={step} />
      {hint && <p className="mt-1 text-xs text-ink-500">{t(hint)}</p>}
    </div>
  );
}

export async function Select({ label, name, options, defaultValue, required, raw }: { label: string; name: string; options: [string, string][]; defaultValue?: string | null; required?: boolean; raw?: boolean }) {
  const t = await getT();
  return (
    <div>
      <label className="label" htmlFor={name}>{t(label)}</label>
      <select id={name} name={name} className="input" defaultValue={defaultValue ?? undefined} required={required}>
        {options.map(([v, l]) => <option key={v} value={v}>{raw ? l : t(l)}</option>)}
      </select>
    </div>
  );
}

/** Ochiladigan forma bloki (JS'siz) */
export async function AddBox({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  const t = await getT();
  return (
    <details className="mb-6 rounded-xl border border-dashed border-brand-400 bg-surface p-4 [&_summary]:cursor-pointer" open={open}>
      <summary className="text-sm font-medium text-brand-700">＋ {t(title)}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

// Ixcham "+" tugma: bosilganda forma tugma ostida ochiladi. Avtomatik to'ldiriladigan bo'limlar uchun.
export async function AddButton({ title, children }: { title: string; children: ReactNode }) {
  const t = await getT();
  return (
    <details className="relative [&_summary::-webkit-details-marker]:hidden">
      <summary title={t(title)} aria-label={t(title)}
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-ink-200 bg-surface text-xl leading-none text-brand-700 hover:bg-brand-50">＋</summary>
      <div className="absolute right-0 z-30 mt-2 w-[min(92vw,44rem)] rounded-xl border border-ink-200 bg-surface p-4 shadow-xl">
        <div className="mb-3 text-sm font-medium">{t(title)}</div>
        {children}
      </div>
    </details>
  );
}

export async function Notice({ kind = "ok", children }: { kind?: "ok" | "err"; children: ReactNode }) {
  const t = await getT();
  return (
    <p role={kind === "err" ? "alert" : "status"} className={`mb-4 rounded-lg p-3 text-sm ${kind === "err" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
      {tr(t, children)}
    </p>
  );
}
