// Analitika dashboardi uchun sof hisob-kitoblar (bazaga bog'liq emas — testlanadi)

export type Q = { y: number; q: number };
export const qKey = (p: Q) => `${p.y}-Q${p.q}`;
export const parseQ = (s: string): Q => ({ y: Number(s.slice(0, 4)), q: Number(s.slice(6)) });
export const qIndex = (p: Q) => p.y * 4 + (p.q - 1);
export const fromIndex = (i: number): Q => ({ y: Math.floor(i / 4), q: (i % 4) + 1 });

/** Chorakning birinchi va oxirgi kuni (YYYY-MM-DD) */
export function qRange(p: Q): [string, string] {
  const m0 = (p.q - 1) * 3 + 1;
  const last = new Date(Date.UTC(p.y, m0 + 2, 0)).getUTCDate();
  const mm = (m: number) => String(m).padStart(2, "0");
  return [`${p.y}-${mm(m0)}-01`, `${p.y}-${mm(m0 + 2)}-${last}`];
}

/** n ta chorak, `end` bilan tugaydi (eskidan yangiga) */
export function lastQuarters(end: Q, n: number): Q[] {
  const e = qIndex(end);
  return Array.from({ length: n }, (_, i) => fromIndex(e - n + 1 + i));
}

/** O'zgarish foizda: (joriy − o'tgan) / |o'tgan|; o'tgan 0 yoki yo'q bo'lsa null */
export function yoyPct(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/** Nisbat; maxraj 0 bo'lsa null */
export function ratio(a: number, b: number): number | null {
  return b ? a / b : null;
}

/** Foiz punktdagi farq (masalan, rentabellik 12% → 9% = −3) */
export function ppDiff(cur: number | null, prev: number | null): number | null {
  return cur === null || prev === null ? null : (cur - prev) * 100;
}

export type Rejim = "qqs" | "soddalashtirilgan" | "aylanma";
/** Soliq yukining taxminiy me'yori (soliq_tolangan / tushum), rejim bo'yicha */
export const TAX_NORM: Record<Rejim, [number, number]> = {
  qqs: [0.03, 0.08],
  soddalashtirilgan: [0.03, 0.05],
  aylanma: [0.01, 0.04],
};
export function taxNormState(rejim: Rejim, yuk: number | null): "past" | "normal" | "yuqori" | null {
  if (yuk === null) return null;
  const [lo, hi] = TAX_NORM[rejim];
  return yuk < lo ? "past" : yuk > hi ? "yuqori" : "normal";
}

/** Joriy likvidlik holati: < 0.8 qizil, < 1.0 sariq */
export function liquidityState(v: number | null): "bad" | "warn" | "ok" | null {
  if (v === null) return null;
  return v < 0.8 ? "bad" : v < 1 ? "warn" : "ok";
}

export type FinRow = { company_id: number; davr: string; tushum: number; sof_foyda: number; joriy_aktiv: number; joriy_majburiyat: number; soliq_tolangan: number; kreditorlik: number; budjet_qarz: number; uzoq_majburiyat: number; kapital: number; pul: number };

/** Oqim ko'rsatkichlari (tushum, foyda, soliq) — choraklar yig'indisi */
export function sumFlow(rows: FinRow[], qs: Set<string>, ids?: Set<number>) {
  let tushum = 0, foyda = 0, soliq = 0, n = 0;
  for (const r of rows) {
    if (!qs.has(r.davr) || (ids && !ids.has(r.company_id))) continue;
    tushum += Number(r.tushum); foyda += Number(r.sof_foyda); soliq += Number(r.soliq_tolangan); n++;
  }
  return { tushum, foyda, soliq, n };
}

/** Balans ko'rsatkichlari — bitta chorak oxiri bo'yicha (yig'ilmaydi) */
export function balanceAt(rows: FinRow[], davr: string, ids?: Set<number>) {
  let ja = 0, jm = 0, kred = 0, bud = 0, uzoq = 0, n = 0;
  for (const r of rows) {
    if (r.davr !== davr || (ids && !ids.has(r.company_id))) continue;
    ja += Number(r.joriy_aktiv); jm += Number(r.joriy_majburiyat); kred += Number(r.kreditorlik); bud += Number(r.budjet_qarz); uzoq += Number(r.uzoq_majburiyat); n++;
  }
  return { likvidlik: ratio(ja, jm), kred, bud, uzoq, n };
}

/** Hisobot intizomi: muddati kelgan hisobotlarning topshirilgan ulushi */
export function discipline(items: { muddat: string; holat: string }[], from: string, to: string, today: string) {
  let due = 0, done = 0, late = 0;
  for (const d of items) {
    if (d.muddat < from || d.muddat > to || d.muddat > today) continue;
    due++;
    if (d.holat === "topshirildi") done++; else late++;
  }
  return { pct: due ? done / due : null, due, late };
}
