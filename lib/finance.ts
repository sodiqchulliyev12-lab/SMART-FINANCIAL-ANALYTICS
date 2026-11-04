// Moliyaviy ko'rsatkichlar (choraklik balans va moliyaviy natijalar asosida). Sof funksiyalar.

export type Financials = {
  davr: string; // "2026-Q3"
  tushum: number; // sof tushum (chorak)
  tannarx: number;
  sof_foyda: number;
  jami_aktiv: number;
  joriy_aktiv: number;
  pul: number;
  debitorlik: number;
  zaxira: number;
  joriy_majburiyat: number;
  uzoq_majburiyat: number;
  kapital: number;
  kreditorlik: number;
  budjet_qarz: number;
  soliq_tolangan: number; // chorakda to'langan soliqlar jami
};

export const FIN_FIELDS: { key: keyof Omit<Financials, "davr">; label: string; hint?: string }[] = [
  { key: "tushum", label: "Sof tushum", hint: "Chorak uchun, 2-shakl 010" },
  { key: "tannarx", label: "Sotilgan mahsulot tannarxi", hint: "2-shakl 020" },
  { key: "sof_foyda", label: "Sof foyda (zarar)", hint: "Zarar bo'lsa minus bilan" },
  { key: "jami_aktiv", label: "Jami aktivlar", hint: "1-shakl balans" },
  { key: "joriy_aktiv", label: "Joriy aktivlar", hint: "1-shakl II bo'lim" },
  { key: "pul", label: "Pul mablag'lari", hint: "Kassa + bank" },
  { key: "debitorlik", label: "Debitorlik qarzi" },
  { key: "zaxira", label: "Tovar-moddiy zaxiralar" },
  { key: "joriy_majburiyat", label: "Joriy majburiyatlar" },
  { key: "uzoq_majburiyat", label: "Uzoq muddatli majburiyatlar" },
  { key: "kapital", label: "O'z kapitali", hint: "1-shakl I bo'lim (passiv)" },
  { key: "kreditorlik", label: "Kreditorlik qarzi" },
  { key: "budjet_qarz", label: "Budjetga qarz", hint: "Shaxsiy hisob varaqasi bo'yicha" },
  { key: "soliq_tolangan", label: "To'langan soliqlar (chorak)" },
];

const div = (a: number, b: number) => (b ? a / b : null);

export type Ratios = {
  joriy_likvidlik: number | null; // joriy aktiv / joriy majburiyat (me'yor ≥ 1.5)
  tezkor_likvidlik: number | null; // (joriy aktiv − zaxira) / joriy majburiyat (≥ 1)
  mutlaq_likvidlik: number | null; // pul / joriy majburiyat (≥ 0.2)
  avtonomiya: number | null; // kapital / jami aktiv (≥ 0.5)
  qarz_yuki: number | null; // (joriy + uzoq majburiyat) / kapital
  yalpi_marja: number | null; // (tushum − tannarx) / tushum
  sof_rentabellik: number | null; // sof foyda / tushum
  roa: number | null; // yillik: sof foyda × 4 / jami aktiv
  debitor_kun: number | null; // debitorlik / (tushum / 90)
  kreditor_kun: number | null; // kreditorlik / (tannarx / 90)
  soliq_yuki: number | null; // to'langan soliq / tushum
  pul_yetish_oy: number | null; // pul / oylik pul xarajati
};

export function ratios(f: Financials): Ratios {
  const monthlySpend = (f.tushum - f.sof_foyda) / 3;
  return {
    joriy_likvidlik: div(f.joriy_aktiv, f.joriy_majburiyat),
    tezkor_likvidlik: div(f.joriy_aktiv - f.zaxira, f.joriy_majburiyat),
    mutlaq_likvidlik: div(f.pul, f.joriy_majburiyat),
    avtonomiya: div(f.kapital, f.jami_aktiv),
    qarz_yuki: f.kapital > 0 ? (f.joriy_majburiyat + f.uzoq_majburiyat) / f.kapital : null,
    yalpi_marja: div(f.tushum - f.tannarx, f.tushum),
    sof_rentabellik: div(f.sof_foyda, f.tushum),
    roa: div(f.sof_foyda * 4, f.jami_aktiv),
    debitor_kun: f.tushum > 0 ? f.debitorlik / (f.tushum / 90) : null,
    kreditor_kun: f.tannarx > 0 ? f.kreditorlik / (f.tannarx / 90) : null,
    soliq_yuki: div(f.soliq_tolangan, f.tushum),
    pul_yetish_oy: monthlySpend > 0 ? f.pul / monthlySpend : null,
  };
}

export type RatioMeta = { key: keyof Ratios; label: string; fmt: "x" | "%" | "kun" | "oy"; good: (v: number) => "good" | "warn" | "bad"; norm: string };

export const RATIO_META: RatioMeta[] = [
  { key: "joriy_likvidlik", label: "Joriy likvidlik", fmt: "x", norm: "≥ 1,5", good: (v) => (v >= 1.5 ? "good" : v >= 1 ? "warn" : "bad") },
  { key: "tezkor_likvidlik", label: "Tezkor likvidlik", fmt: "x", norm: "≥ 1", good: (v) => (v >= 1 ? "good" : v >= 0.7 ? "warn" : "bad") },
  { key: "mutlaq_likvidlik", label: "Mutlaq likvidlik", fmt: "x", norm: "≥ 0,2", good: (v) => (v >= 0.2 ? "good" : v >= 0.1 ? "warn" : "bad") },
  { key: "avtonomiya", label: "Moliyaviy mustaqillik", fmt: "%", norm: "≥ 50%", good: (v) => (v >= 0.5 ? "good" : v >= 0.2 ? "warn" : "bad") },
  { key: "qarz_yuki", label: "Qarz / kapital", fmt: "x", norm: "≤ 1", good: (v) => (v <= 1 ? "good" : v <= 2.5 ? "warn" : "bad") },
  { key: "yalpi_marja", label: "Yalpi marja", fmt: "%", norm: "soha bo'yicha", good: (v) => (v >= 0.15 ? "good" : v >= 0.05 ? "warn" : "bad") },
  { key: "sof_rentabellik", label: "Sof rentabellik", fmt: "%", norm: "> 0", good: (v) => (v >= 0.05 ? "good" : v >= 0 ? "warn" : "bad") },
  { key: "roa", label: "Aktivlar rentabelligi (yillik)", fmt: "%", norm: "> 5%", good: (v) => (v >= 0.05 ? "good" : v >= 0 ? "warn" : "bad") },
  { key: "debitor_kun", label: "Debitorlik aylanishi", fmt: "kun", norm: "≤ 45 kun", good: (v) => (v <= 45 ? "good" : v <= 90 ? "warn" : "bad") },
  { key: "kreditor_kun", label: "Kreditorlik aylanishi", fmt: "kun", norm: "≤ 60 kun", good: (v) => (v <= 60 ? "good" : v <= 120 ? "warn" : "bad") },
  { key: "soliq_yuki", label: "Soliq yuki", fmt: "%", norm: "soha o'rtachasi", good: (v) => (v >= 0.02 ? "good" : v >= 0.01 ? "warn" : "bad") },
  { key: "pul_yetish_oy", label: "Pul zaxirasi", fmt: "oy", norm: "≥ 1 oy", good: (v) => (v >= 1 ? "good" : v >= 0.5 ? "warn" : "bad") },
];

export function fmtRatio(v: number | null, fmt: RatioMeta["fmt"]): string {
  if (v === null || !Number.isFinite(v)) return "—";
  if (fmt === "%") return `${(v * 100).toFixed(1).replace(".", ",")}%`;
  if (fmt === "kun") return `${Math.round(v)} kun`;
  if (fmt === "oy") return `${v.toFixed(1).replace(".", ",")} oy`;
  return v.toFixed(2).replace(".", ",");
}

/** "2026-Q3" → oldingi chorak "2026-Q2" */
export function prevQuarter(davr: string): string {
  const m = davr.match(/^(\d{4})-Q(\d)$/);
  if (!m) return "";
  const y = Number(m[1]);
  const q = Number(m[2]);
  return q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`;
}

/** Oxirgi 4 chorak tushumi yig'indisi (yillik aylanma). Kam chorak bo'lsa — yillikka keltiriladi. */
export function annualRevenue(sortedAsc: Financials[]): number {
  const last = sortedAsc.slice(-4);
  if (!last.length) return 0;
  const sum = last.reduce((s, f) => s + f.tushum, 0);
  return (sum / last.length) * 4;
}

/** Joriy chorak nomi, masalan 2026-11-04 → "2026-Q4" */
export function quarterOf(d: Date): string {
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
}

/** Chorak tugash sanasi */
export function quarterEnd(davr: string): Date | null {
  const m = davr.match(/^(\d{4})-Q(\d)$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) * 3, 0));
}
