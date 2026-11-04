import Link from "next/link";
import type { ReactNode } from "react";

// Kutubxonasiz SVG grafiklar. Ranglar CSS o'zgaruvchilaridan (kunduzgi/tungi rejimga mos).
// Har bir belgi <title> bilan — sichqoncha ustiga kelganda qiymat ko'rinadi.

export const C = {
  s1: "rgb(var(--c-s1))",
  s2: "rgb(var(--c-s2))",
  s3: "rgb(var(--c-s3))",
  s4: "rgb(var(--c-s4))",
  good: "rgb(var(--c-emerald-500))",
  warn: "rgb(234 179 8)",
  serious: "rgb(var(--c-orange-500))",
  bad: "rgb(var(--c-red-500))",
  brand: "rgb(var(--c-brand-500))",
  muted: "rgb(var(--c-ink-300))",
};

export type Item = { label: string; value: number; href?: string; title?: string; active?: boolean };

function Wrap({ href, children }: { href?: string; children: ReactNode }) {
  return href ? <Link href={href} className="group">{children}</Link> : <g>{children}</g>;
}

/** KPI kartasi: qiymat, 8 chorak trendi, o'tgan yil va o'zgarish */
export function Kpi({ label, value, spark, pyLabel, py, delta, deltaUnit = "%", upIsGood = true, hint, href }: {
  label: string; value: string; spark: (number | null)[]; pyLabel: string; py: string; delta: number | null; deltaUnit?: string; upIsGood?: boolean; hint?: string; href?: string;
}) {
  const pts = spark.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const w = 200, h = 32;
  let path = "";
  if (pts.length >= 2) {
    const min = Math.min(...pts.map((p) => p[1])), max = Math.max(...pts.map((p) => p[1]));
    const span = max - min || 1;
    const x = (i: number) => (i / Math.max(spark.length - 1, 1)) * w;
    const y = (v: number) => h - 3 - ((v - min) / span) * (h - 6);
    path = pts.map((p, k) => `${k ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
  }
  const good = delta === null || delta === 0 ? null : (delta > 0) === upIsGood;
  const body = (
    <div className="flex h-full flex-col rounded-xl border border-ink-100 bg-surface p-4 shadow-sm transition hover:border-brand-100">
      <p className="truncate text-xs font-medium text-ink-500" title={label}>{label}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="whitespace-nowrap text-2xl font-semibold tabular-nums text-ink-900 2xl:text-3xl">{value}</p>
        {delta !== null ? (
          <span className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${good === null ? "bg-ink-100 text-ink-500" : good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta).toFixed(1).replace(".", ",")}{deltaUnit}
          </span>
        ) : null}
      </div>
      <div className="mt-2 h-8">
        {path ? (
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-8 w-full overflow-visible" aria-hidden>
            <path d={path} fill="none" stroke={C.brand} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : <div className="h-px w-full translate-y-4 bg-ink-100" />}
      </div>
      <p className="mt-2 truncate text-xs text-ink-500">{pyLabel}: <span className="tabular-nums text-ink-700">{py}</span></p>
      <p className="mt-0.5 min-h-[1rem] text-[11px] text-ink-500">{hint ?? "\u00a0"}</p>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

/** Vertikal ustunlar (drilldown uchun havola bilan) */
export function VBars({ items, fmt, empty }: { items: Item[]; fmt: (v: number) => string; empty: string }) {
  if (!items.length) return <p className="py-10 text-center text-sm text-ink-500">{empty}</p>;
  const W = 360, H = 210, top = 22, bottom = 26;
  const max = Math.max(...items.map((i) => i.value), 1);
  const slot = W / items.length;
  const bw = Math.min(72, slot * 0.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
      <line x1="0" x2={W} y1={H - bottom} y2={H - bottom} className="stroke-ink-100" />
      {items.map((it, i) => {
        const bh = Math.max(((H - top - bottom) * Math.max(it.value, 0)) / max, it.value > 0 ? 3 : 0);
        const x = i * slot + (slot - bw) / 2;
        const y = H - bottom - bh;
        const r = Math.min(4, bh / 2);
        const d = `M${x},${H - bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${H - bottom} Z`;
        return (
          <Wrap key={it.label} href={it.href}>
            <title>{it.title ?? `${it.label}: ${fmt(it.value)}`}</title>
            <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
            <path d={d} fill={it.active === false ? C.muted : C.brand} className="transition group-hover:opacity-80" />
            {it.value !== 0 && <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="600" className="fill-ink-900 tabular-nums">{fmt(it.value)}</text>}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="12" className="fill-ink-500">{it.label}</text>
          </Wrap>
        );
      })}
    </svg>
  );
}

/** Halqa diagramma + legenda (ulush va qiymat bilan) */
export function Donut({ items, fmt, center, centerSub, empty }: { items: (Item & { color: string })[]; fmt: (v: number) => string; center?: string; centerSub?: string; empty: string }) {
  const list = items.filter((i) => i.value > 0);
  const total = list.reduce((s, i) => s + i.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-ink-500">{empty}</p>;
  const R = 52, SW = 22, Cn = 2 * Math.PI * R, gap = list.length > 1 ? 2.5 : 0;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img">
        <circle cx="70" cy="70" r={R} fill="none" className="stroke-ink-100" strokeWidth={SW} />
        {list.map((it) => {
          const len = (it.value / total) * Cn;
          const el = (
            <Wrap key={it.label} href={it.href}>
              <title>{`${it.label}: ${fmt(it.value)} (${((it.value / total) * 100).toFixed(1)}%)`}</title>
              <circle cx="70" cy="70" r={R} fill="none" stroke={it.color} strokeWidth={SW}
                strokeDasharray={`${Math.max(len - gap, 0.5)} ${Cn}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" className="transition group-hover:opacity-80" />
            </Wrap>
          );
          acc += len;
          return el;
        })}
        {center && <text x="70" y={centerSub ? 70 : 75} textAnchor="middle" fontSize="15" fontWeight="700" className="fill-ink-900 tabular-nums">{center}</text>}
        {centerSub && <text x="70" y="86" textAnchor="middle" fontSize="10" className="fill-ink-500">{centerSub}</text>}
      </svg>
      <ul className="w-full min-w-0 space-y-2 text-sm">
        {list.map((it) => (
          <li key={it.label} className="flex items-start gap-2">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: it.color }} />
            {it.href ? <Link href={it.href} className="min-w-0 text-ink-700 hover:underline">{it.label}</Link> : <span className="min-w-0 text-ink-700">{it.label}</span>}
            <span className="ml-auto whitespace-nowrap tabular-nums text-ink-900"><b>{((it.value / total) * 100).toFixed(1).replace(".", ",")}%</b> <span className="text-xs text-ink-500">{fmt(it.value)}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gorizontal reyting ustunlari */
export function HBars({ items, fmt, empty, color = C.brand }: { items: Item[]; fmt: (v: number) => string; empty: string; color?: string }) {
  if (!items.length) return <p className="py-10 text-center text-sm text-ink-500">{empty}</p>;
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((it) => {
        const pct = (Math.abs(it.value) / max) * 100;
        const row = (
          <div className="grid grid-cols-[minmax(0,40%)_1fr] items-center gap-3 text-sm" title={it.title ?? `${it.label}: ${fmt(it.value)}`}>
            <span className="truncate text-ink-700">{it.label}</span>
            <span className="flex items-center gap-2">
              <span className="h-5 rounded-r" style={{ width: `${Math.max(pct, 1.5)}%`, background: it.value < 0 ? C.bad : color, borderRadius: "0 4px 4px 0" }} />
              <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-ink-900">{fmt(it.value)}</span>
            </span>
          </div>
        );
        return <li key={it.label}>{it.href ? <Link href={it.href} className="block rounded hover:bg-ink-50">{row}</Link> : row}</li>;
      })}
    </ul>
  );
}

/** Gorizontal to'plangan ustunlar (holatlar bo'yicha) */
export function StackBars({ items, series, empty }: { items: { label: string; parts: number[]; href?: string }[]; series: { label: string; color: string }[]; empty: string }) {
  if (!items.length) return <p className="py-10 text-center text-sm text-ink-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.parts.reduce((s, v) => s + v, 0)), 1);
  return (
    <div>
      <ul className="space-y-2.5">
        {items.map((it) => {
          const tot = it.parts.reduce((s, v) => s + v, 0);
          const row = (
            <div className="grid grid-cols-[minmax(0,40%)_1fr] items-center gap-3 text-sm">
              <span className="truncate text-ink-700" title={it.label}>{it.label}</span>
              <span className="flex items-center gap-2">
                <span className="flex h-5 gap-[2px]" style={{ width: `${(tot / max) * 100}%` }}>
                  {it.parts.map((v, k) => v ? (
                    <span key={k} className="h-full first:rounded-l-sm last:rounded-r" style={{ flexGrow: v, background: series[k].color }} title={`${it.label} · ${series[k].label}: ${v}`} />
                  ) : null)}
                </span>
                <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-ink-900">{tot}</span>
              </span>
            </div>
          );
          return <li key={it.label}>{it.href ? <Link href={it.href} className="block rounded hover:bg-ink-50">{row}</Link> : row}</li>;
        })}
      </ul>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-700">
        {series.map((s) => <span key={s.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  );
}
