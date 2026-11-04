// Soliq hisobotlari muddatlari: davrlarni hisoblash va dam olish kuniga tushgan muddatni keyingi ish kuniga surish.
// Bu fayl bazaga bog'liq emas (sof funksiyalar) — testlar shu yerdagi mantiqni tekshiradi.

export type Periodicity = "oy" | "chorak" | "yil";

export type TaxType = {
  code: string;
  nomi: string;
  davr: Periodicity;
  /** Davr tugagandan keyin nechanchi oyda topshiriladi (1 = keyingi oy) */
  oy_offset: number;
  /** O'sha oyning nechanchi kuni */
  kun: number;
  /** soliq (to'lovi bor) yoki statistika (faqat hisobot) */
  turi?: "soliq" | "statistika";
  /** Kim topshiradi: qisqa izoh */
  izoh?: string;
};

/**
 * Standart muddatlar (taxminiy, 2026 yil holati). Har bir firma «Sozlamalar → Soliq turlari» bo'limida
 * o'zgartira oladi; baza birinchi marta yaratilganda shu ro'yxat yoziladi.
 * 2026 yildan QQS, aylanma, JShDS/ijtimoiy, mol-mulk va yer hisobotlarini soliq organi o'zi tuzadi —
 * to'lovchi 5 kun ichida tuzatmasa, qabul qilingan hisoblanadi (SK 81-m.). Shuning uchun muddat nazorati
 * «topshirish» emas, «tekshirib tasdiqlash» ma'nosida ham muhim.
 */
export const DEFAULT_TAX_TYPES: TaxType[] = [
  { code: "qqs", nomi: "QQS", davr: "oy", oy_offset: 1, kun: 20 },
  { code: "aylanma", nomi: "Aylanmadan olinadigan soliq", davr: "oy", oy_offset: 1, kun: 15 },
  { code: "jshds", nomi: "JShDS va ijtimoiy soliq", davr: "oy", oy_offset: 1, kun: 15 },
  { code: "foyda", nomi: "Foyda solig'i (chorak)", davr: "chorak", oy_offset: 1, kun: 20 },
  { code: "foyda_yil", nomi: "Foyda solig'i (yillik)", davr: "yil", oy_offset: 3, kun: 1 },
  { code: "moliyaviy", nomi: "Moliyaviy hisobot (chorak)", davr: "chorak", oy_offset: 1, kun: 25 },
  { code: "mol_mulk", nomi: "Mol-mulk solig'i (yillik)", davr: "yil", oy_offset: 3, kun: 1 },
  { code: "yer", nomi: "Yer solig'i (yillik)", davr: "yil", oy_offset: 2, kun: 1 },
  ...STAT_TYPES(),
];

/**
 * Statistika hisobotlari (stat.uz, 2026 yil shakllari; muddatlar taxminiy). Har bir korxona qaysi shaklni
 * topshirishi stat.uz «Taqdim etiladigan hisobotlar ro'yxati» xizmatida (ERI bilan) ko'rinadi — korxona
 * sahifasida shu ro'yxat bo'yicha belgilanadi. Kichik korxona va mikrofirmalar ko'p shakllardan ozod.
 */
function STAT_TYPES(): TaxType[] {
  const st = (code: string, nomi: string, davr: Periodicity, oy_offset: number, kun: number, izoh: string): TaxType =>
    ({ code, nomi, davr, oy_offset, kun, turi: "statistika", izoh });
  return [
    st("st_1korxona", "1-korxona (yillik asosiy ko'rsatkichlar)", "yil", 4, 1, "Barcha korxonalar; xodimi 5 tadan kam yoki tushumi 2000 BHM gacha mikro va kichik korxonalar 3 yilda bir marta. MHXS bo'yicha hisobot yurituvchilar 5-maygacha"),
    st("st_12korxona", "12-korxona (oylik)", "oy", 1, 5, "Tijorat yuridik shaxslari; kichik korxona, mikrofirma va qishloq xo'jaligi ishlab chiqaruvchilari bundan mustasno"),
    st("st_4mehnat", "4-mehnat (choraklik)", "chorak", 1, 6, "Yuridik shaxslar; kichik korxona va mikrofirmalar bundan mustasno"),
    st("st_4invest", "4-invest asosiy (choraklik)", "chorak", 1, 6, "Investitsiya faoliyati yurituvchi yuridik shaxslar (ayrim kichik korxonalar ozod)"),
    st("st_4invest_x", "4-invest xorijiy (choraklik)", "chorak", 1, 29, "Xorijiy investitsiyali korxonalar, xorijdan mablag' oluvchilar, eksport/import qiluvchilar"),
    st("st_4transport", "4-transport (choraklik)", "chorak", 1, 5, "5 tadan ortiq avtotransporti bor yuridik shaxslar (kichik korxonalar bundan mustasno)"),
    st("st_4fx", "4-fx (fermer xo'jaligi, choraklik)", "chorak", 1, 5, "Fermer xo'jaliklari"),
    st("st_4miz", "4-MIZ (erkin iqtisodiy zona, choraklik)", "chorak", 1, 20, "EIZ, KSIZ, texnopark va klaster ishtirokchilari"),
    st("st_4kb", "4-kb tanlanma kuzatuv (choraklik)", "chorak", 1, 5, "Faqat tanlanma ro'yxatiga kiritilgan kichik korxona va mikrofirmalar"),
  ];
}

/** Soliq rejimiga qarab yangi korxonaga avtomatik belgilanadigan soliqlar */
export const TAXES_BY_REGIME: Record<string, string[]> = {
  qqs: ["qqs", "foyda", "foyda_yil", "jshds", "moliyaviy", "mol_mulk"],
  soddalashtirilgan: ["qqs", "jshds", "moliyaviy", "mol_mulk"],
  aylanma: ["aylanma", "jshds", "moliyaviy"],
};

export const REGIMES: Record<string, string> = {
  qqs: "Umumiy (QQS + foyda)",
  soddalashtirilgan: "Soddalashtirilgan QQS 6%",
  aylanma: "Aylanmadan olinadigan soliq",
};

export function iso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

/** Toshkent vaqtidagi bugungi sana (UTC yarim tunida) */
export function todayTashkent(now = new Date()): Date {
  return parseIso(iso(new Date(now.getTime() + 5 * 3600000)));
}

export type Calendar = { holidays: Set<string>; workdays: Set<string> };

/** Muddat shanba, yakshanba yoki bayramga tushsa — keyingi ish kuniga. «Ish kuni» deb belgilangan dam kuni ish kuni hisoblanadi. */
export function toWorkday(date: Date, cal: Calendar): Date {
  let d = date;
  for (let i = 0; i < 31; i++) {
    const key = iso(d);
    const wd = d.getUTCDay();
    const weekend = wd === 0 || wd === 6;
    if (cal.workdays.has(key) || (!weekend && !cal.holidays.has(key))) return d;
    d = addDays(d, 1);
  }
  return d;
}

export type PeriodDeadline = { davr: string; muddat: string };

/** Davr nomi: oy — "2026-10", chorak — "2026-Q3", yil — "2026" */
function periodLabel(type: Periodicity, year: number, idx: number): string {
  if (type === "oy") return `${year}-${String(idx + 1).padStart(2, "0")}`;
  if (type === "chorak") return `${year}-Q${idx + 1}`;
  return String(year);
}

/** Davr tugaydigan oy (0..11) */
function periodEndMonth(type: Periodicity, idx: number): number {
  if (type === "oy") return idx;
  if (type === "chorak") return idx * 3 + 2;
  return 11;
}

/**
 * Muddati [from, to] oralig'iga tushadigan barcha davrlar.
 * Yillik foyda solig'i bor bo'lsa, 4-chorak uchun choraklik foyda hisoboti alohida yaratilmaydi.
 */
export function deadlinesBetween(t: TaxType, from: Date, to: Date, cal: Calendar): PeriodDeadline[] {
  const out: PeriodDeadline[] = [];
  const perYear = t.davr === "oy" ? 12 : t.davr === "chorak" ? 4 : 1;
  for (let year = from.getUTCFullYear() - 2; year <= to.getUTCFullYear(); year++) {
    for (let idx = 0; idx < perYear; idx++) {
      if (t.code === "foyda" && idx === 3) continue;
      const endMonth = periodEndMonth(t.davr, idx);
      const raw = new Date(Date.UTC(year, endMonth + t.oy_offset, t.kun));
      const muddat = toWorkday(raw, cal);
      if (muddat >= from && muddat <= to) out.push({ davr: periodLabel(t.davr, year, idx), muddat: iso(muddat) });
    }
  }
  return out;
}

/** Davr nomini o'qishga qulay ko'rinishga keltirish */
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
export function periodHuman(davr: string): string {
  const m = davr.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  const q = davr.match(/^(\d{4})-Q(\d)$/);
  if (q) return `${q[2]}-chorak ${q[1]}`;
  return `${davr} yil`;
}
