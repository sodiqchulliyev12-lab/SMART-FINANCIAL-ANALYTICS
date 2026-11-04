// Risk dvigateli: korxonaning soliq intizomi, moliyaviy holati va rejim xavflarini bitta 0–100 ballga yig'adi.
// Har bir omil izoh va aniq tavsiya bilan qaytadi — buxgalter nima qilishni darhol ko'radi.
// Sof funksiya: kirish ma'lumotlari tashqaridan beriladi (bazadan yoki testdan).

import { annualRevenue, prevQuarter, quarterEnd, ratios, type Financials } from "./finance";
import { daysBetween, parseIso } from "./tax-calendar";

export type RiskGroup = "soliq" | "moliya" | "rejim" | "shartnoma" | "malumot";

export const GROUP_LABEL: Record<RiskGroup, string> = {
  soliq: "Soliq intizomi",
  moliya: "Moliyaviy holat",
  rejim: "Soliq rejimi",
  shartnoma: "Shartnomalar",
  malumot: "Ma'lumot sifati",
};

export type RiskFactor = {
  code: string;
  group: RiskGroup;
  title: string;
  detail: string;
  points: number;
  tavsiya: string;
};

export type RiskLevel = "past" | "orta" | "yuqori" | "kritik";

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  past: "Past",
  orta: "O'rta",
  yuqori: "Yuqori",
  kritik: "Kritik",
};

export type RiskResult = { score: number; level: RiskLevel; factors: RiskFactor[]; byGroup: Record<RiskGroup, number> };

export type RiskInput = {
  today: Date;
  regime: string; // qqs | soddalashtirilgan | aylanma
  bhm: number; // bazaviy hisoblash miqdori, so'm
  deadlines: { soliq: string; turi?: string; davr: string; muddat: string; hisobot_holati: string; tolov_holati: string }[];
  letters: { raqam: string; tur: string; javob_muddati: string | null; holati: string }[];
  ehf: { raqam: string; kontragent: string; sana: string; holati: string; yonalish: string; xavfli: boolean; summa: number }[];
  leases: { raqam: string; tugash: string; holati: string }[];
  /** my.mehnat.uz: hozir ishlayotganlar va oxirgi 90 kundagi harakat; null — ma'lumot yo'q */
  workforce?: WorkforceStats | null;
  /** dep.customs.uz/qarzdor bo'yicha bojxona qarzi, so'm */
  customsDebt?: number;
  /** contract.customs.uz: faol tashqi savdo shartnomalari */
  contracts?: TifContract[];
  financials: Financials[]; // davr bo'yicha o'sish tartibida
};

export type WorkforceStats = { active: number; hired90: number; left90: number };

/** 90 kunlik ketish darajasi: ketganlar / (hozirgi + ketganlar - kirganlar), ya'ni davr boshidagi soniga nisbatan */
export function turnover90(w: WorkforceStats): number {
  const start = w.active + w.left90 - w.hired90;
  return start > 0 ? w.left90 / start : 0;
}

export type TifContract = {
  raqam: string; turi: string; kontragent: string; valyuta: string;
  summa: number; tolangan: number; yetkazilgan: number;
  sana: string; ochiq_sana: string | null; tugash: string | null; holati: string;
};

/** Import avansi tovar bilan, eksport tovari pul bilan qoplanishi kerak bo'lgan odatiy muddat (kun) */
export const TIF_SETTLE_DAYS = 180;

/** Shartnoma bo'yicha qoplanmagan qism: import uchun to'langan-kelgan, eksport uchun jo'natilgan-tushgan */
export function tifOpen(c: Pick<TifContract, "turi" | "tolangan" | "yetkazilgan">): number {
  const d = c.turi === "eksport" ? c.yetkazilgan - c.tolangan : c.tolangan - c.yetkazilgan;
  return d > 0.005 ? d : 0;
}

const fmtCur = (v: number, cur: string) => `${Math.round(v).toLocaleString("ru-RU").replace(/ /g, " ")} ${cur}`;

/** Aylanmadan umumiy rejimga majburiy o'tish chegarasi: 01.06.2026 dan 12 000 BHM (PF-100) */
export const TURNOVER_LIMIT_BHM = 12000;

const fmtSom = (v: number) => `${Math.round(v).toLocaleString("ru-RU").replace(/ /g, " ")} so'm`;
const plural = (n: number, w: string) => `${n} ta ${w}`;

export function levelOf(score: number): RiskLevel {
  if (score >= 75) return "kritik";
  if (score >= 50) return "yuqori";
  if (score >= 25) return "orta";
  return "past";
}

export function assessRisk(input: RiskInput): RiskResult {
  const { today } = input;
  const f: RiskFactor[] = [];
  const add = (x: RiskFactor) => x.points > 0 && f.push(x);

  // ── Soliq intizomi ──────────────────────────────────────────
  const all = input.deadlines.filter((d) => d.hisobot_holati !== "topshirildi" || d.tolov_holati === "kutilmoqda");
  const open = all.filter((d) => d.turi !== "statistika");
  const statOpen = all.filter((d) => d.turi === "statistika" && d.hisobot_holati !== "topshirildi");
  const overdue = open.filter((d) => daysBetween(parseIso(d.muddat), today) > 0);
  if (overdue.length) {
    const worst = Math.max(...overdue.map((d) => daysBetween(parseIso(d.muddat), today)));
    add({
      code: "hisobot_kechikdi",
      group: "soliq",
      title: "Muddati o'tgan hisobot/to'lov",
      detail: `${plural(overdue.length, "majburiyat")} kechikkan, eng uzog'i ${worst} kun. ${overdue.slice(0, 3).map((d) => `${d.soliq} (${d.davr})`).join(", ")}`,
      points: Math.min(30, overdue.length * 12),
      tavsiya: "Bugunoq topshiring: kechikkan hisobot uchun jarima (kichik korxonaga 3 BHM) va har bir kunga penya hisoblanadi.",
    });
  }
  const soon = open.filter((d) => {
    const n = daysBetween(today, parseIso(d.muddat));
    return n >= 0 && n <= 3;
  });
  if (soon.length) {
    add({
      code: "muddat_yaqin",
      group: "soliq",
      title: "3 kun ichida muddat",
      detail: soon.map((d) => `${d.soliq} (${d.davr}) — ${d.muddat}`).join(", "),
      points: Math.min(12, soon.length * 4),
      tavsiya: "Hisobotni tekshirib, muddatdan oldin topshiring. Soliq organi tuzgan hisobotni 5 kun ichida tuzatmasangiz, u qabul qilingan hisoblanadi.",
    });
  }

  const statLate = statOpen.filter((d) => daysBetween(parseIso(d.muddat), today) > 0);
  if (statLate.length) {
    add({
      code: "stat_kechikdi",
      group: "soliq",
      title: "Topshirilmagan statistika hisoboti",
      detail: statLate.slice(0, 3).map((d) => `${d.soliq} (${d.davr}) — ${d.muddat}`).join(", "),
      points: Math.min(16, statLate.length * 8),
      tavsiya: "Statistika hisobotini o'z vaqtida topshirmaslik uchun ma'muriy jarima qo'llanadi. e-Stat orqali darhol topshiring.",
    });
  }
  const statSoon = statOpen.filter((d) => {
    const n = daysBetween(today, parseIso(d.muddat));
    return n >= 0 && n <= 3;
  });
  if (statSoon.length) {
    add({
      code: "stat_yaqin",
      group: "soliq",
      title: "3 kun ichida statistika hisoboti",
      detail: statSoon.map((d) => `${d.soliq} (${d.davr}) — ${d.muddat}`).join(", "),
      points: Math.min(6, statSoon.length * 3),
      tavsiya: "Shaklni e-Stat'da oldindan to'ldirib qo'ying.",
    });
  }

  const openLetters = input.letters.filter((l) => l.holati === "yangi" && l.javob_muddati);
  const lateLetters = openLetters.filter((l) => daysBetween(parseIso(l.javob_muddati!), today) > 0);
  if (lateLetters.length) {
    add({
      code: "xat_javobsiz",
      group: "soliq",
      title: "Javob muddati o'tgan soliq xatlari",
      detail: lateLetters.slice(0, 3).map((l) => `${l.tur} №${l.raqam}`).join(", "),
      points: Math.min(30, lateLetters.length * 15),
      tavsiya: "Elektron ogohlantirishga 3 kunda javob berilmasa, sayyor tekshiruv tayinlanishi mumkin (SK 159-1-m.). Darhol javob tayyorlang.",
    });
  }
  const letterSoon = openLetters.filter((l) => {
    const n = daysBetween(today, parseIso(l.javob_muddati!));
    return n >= 0 && n <= 3;
  });
  if (letterSoon.length) {
    add({
      code: "xat_yaqin",
      group: "soliq",
      title: "Javob muddati yaqin xatlar",
      detail: letterSoon.map((l) => `${l.tur} №${l.raqam} — ${l.javob_muddati}`).join(", "),
      points: Math.min(12, letterSoon.length * 6),
      tavsiya: "Javobni va tasdiqlovchi hujjatlarni oldindan tayyorlang.",
    });
  }

  const unsigned = input.ehf.filter((e) => e.holati === "imzo_kutmoqda" && daysBetween(parseIso(e.sana), today) > 5);
  if (unsigned.length) {
    add({
      code: "ehf_imzosiz",
      group: "soliq",
      title: "Uzoq vaqt imzolanmagan EHF",
      detail: `${plural(unsigned.length, "faktura")} 5 kundan ortiq imzo kutmoqda`,
      points: Math.min(12, unsigned.length * 3),
      tavsiya: "Kiruvchi fakturalarni imzolang yoki rad eting: imzolanmagan faktura bo'yicha QQS hisobga olinmaydi.",
    });
  }
  const risky = input.ehf.filter((e) => e.xavfli && e.yonalish === "kiruvchi" && e.holati !== "rad");
  if (risky.length) {
    const sum = risky.reduce((s, e) => s + e.summa, 0);
    add({
      code: "ehf_xavfli",
      group: "soliq",
      title: "Yuqori tavakkalchilikdagi kontragentlar",
      detail: `${plural(risky.length, "faktura")}, jami ${fmtSom(sum)}: ${[...new Set(risky.map((e) => e.kontragent))].slice(0, 3).join(", ")}`,
      points: Math.min(16, risky.length * 8),
      tavsiya: "Yuqori tavakkalchilikdagi ESF bo'yicha QQS yetkazuvchi to'lamaguncha hisobga olinmaydi (2026). Kontragentni almashtirish yoki to'lovni ushlab turishni ko'rib chiqing.",
    });
  }

  // ── Moliyaviy holat ─────────────────────────────────────────
  const fin = input.financials;
  const last = fin[fin.length - 1];
  if (last) {
    const r = ratios(last);
    if (last.kapital <= 0) {
      add({
        code: "kapital_manfiy",
        group: "moliya",
        title: "O'z kapitali manfiy",
        detail: `${last.davr}: kapital ${fmtSom(last.kapital)}`,
        points: 20,
        tavsiya: "Sof aktivlar ustav kapitalidan kam bo'lsa, qonunga ko'ra kapitalni kamaytirish yoki tugatish masalasi ko'riladi. Ta'sischilar bilan kapitalni to'ldirishni muhokama qiling.",
      });
    }
    if (r.joriy_likvidlik !== null && r.joriy_likvidlik < 1.5) {
      const bad = r.joriy_likvidlik < 1;
      add({
        code: "likvidlik_past",
        group: "moliya",
        title: bad ? "To'lov qobiliyati yetarli emas" : "Likvidlik me'yordan past",
        detail: `Joriy likvidlik ${r.joriy_likvidlik.toFixed(2)} (me'yor ≥ 1,5)`,
        points: bad ? 15 : 6,
        tavsiya: "Debitorlikni yig'ishni tezlashtiring, qisqa muddatli qarzlarni uzoq muddatliga o'tkazing, ortiqcha zaxirani kamaytiring.",
      });
    }
    if (r.pul_yetish_oy !== null && r.pul_yetish_oy < 0.5) {
      const crit = r.pul_yetish_oy < 0.25;
      add({
        code: "pul_kam",
        group: "moliya",
        title: crit ? "Pul bir haftalik xarajatga ham yetmaydi" : "Pul zaxirasi yarim oydan kam",
        detail: `Mavjud pul ${fmtSom(last.pul)} taxminan ${Math.max(1, Math.round(r.pul_yetish_oy * 30))} kunlik xarajatga yetadi`,
        points: crit ? 10 : 5,
        tavsiya: "Keyingi 30 kunlik to'lov kalendarini tuzing (ish haqi, soliq, yetkazuvchilar) va tushumlarni oldindan rejalang.",
      });
    }
    if (last.sof_foyda < 0) {
      const prev = fin.find((x) => x.davr === prevQuarter(last.davr));
      const twice = prev && prev.sof_foyda < 0;
      add({
        code: "zarar",
        group: "moliya",
        title: twice ? "Ketma-ket ikki chorak zarar" : "Chorak zarar bilan yopilgan",
        detail: `${last.davr}: ${fmtSom(last.sof_foyda)}${twice ? `, ${prev!.davr}: ${fmtSom(prev!.sof_foyda)}` : ""}`,
        points: twice ? 16 : 8,
        tavsiya: "Xarajatlar tarkibini tahlil qiling. Doimiy zarar soliq organi uchun tavakkalchilik belgisi bo'lib, tekshiruvga sabab bo'lishi mumkin.",
      });
    }
    const prev = fin.find((x) => x.davr === prevQuarter(last.davr));
    if (prev && prev.tushum > 0) {
      const change = (last.tushum - prev.tushum) / prev.tushum;
      if (change <= -0.3) {
        add({
          code: "tushum_tushdi",
          group: "moliya",
          title: "Tushum keskin kamaygan",
          detail: `${prev.davr} → ${last.davr}: ${Math.round(change * 100)}%`,
          points: 8,
          tavsiya: "Sababini aniqlang (mavsumiylik, mijoz yo'qotilishi). Pul oqimi rejasini qayta ko'rib chiqing.",
        });
      }
    }
    if (last.budjet_qarz > 0) {
      add({
        code: "budjet_qarz",
        group: "moliya",
        title: "Budjetga qarz bor",
        detail: `Qarz ${fmtSom(last.budjet_qarz)}`,
        points: 10,
        tavsiya: "2026 yildan soliq qarzi debitorlaringiz hisobidan ham undiriladi (SK 121-1-m.). Bo'lib to'lash yoki darhol to'lashni rejalang.",
      });
    }
    if (r.debitor_kun !== null && r.debitor_kun > 90) {
      add({
        code: "debitorlik_kop",
        group: "moliya",
        title: "Debitorlik juda sekin yig'ilmoqda",
        detail: `Debitorlik aylanishi ${Math.round(r.debitor_kun)} kun`,
        points: 5,
        tavsiya: "Muddati o'tgan debitorlar bilan akt sverka qiling, to'lov muddatlarini shartnomada qisqartiring.",
      });
    }
    if (r.avtonomiya !== null && last.kapital > 0 && r.avtonomiya < 0.2) {
      add({
        code: "qarzga_bogliq",
        group: "moliya",
        title: "Korxona qarzga juda bog'liq",
        detail: `Moliyaviy mustaqillik ${(r.avtonomiya * 100).toFixed(0)}%`,
        points: 6,
        tavsiya: "Yangi qarz olishdan oldin foyda hisobidan kapitalni mustahkamlang.",
      });
    }
    if (input.regime !== "aylanma" && r.soliq_yuki !== null && last.tushum > 0 && r.soliq_yuki < 0.01) {
      add({
        code: "soliq_yuki_past",
        group: "rejim",
        title: "Soliq yuki juda past",
        detail: `To'langan soliq tushumning ${(r.soliq_yuki * 100).toFixed(2)}%`,
        points: 8,
        tavsiya: "Soha o'rtachasidan ancha past soliq yuki kameral tahlilda tavakkalchilik belgisi hisoblanadi. Xarajatlar va QQS hisobga olishni hujjatlar bilan asoslang.",
      });
    }
  }

  // ── Rejim ───────────────────────────────────────────────────
  if (input.regime === "aylanma" && input.bhm > 0 && fin.length) {
    const limit = TURNOVER_LIMIT_BHM * input.bhm;
    const yearly = annualRevenue(fin);
    const share = yearly / limit;
    if (share >= 0.8) {
      add({
        code: "aylanma_chegara",
        group: "rejim",
        title: share >= 1 ? "Aylanma chegarasidan oshgan" : "Aylanma chegarasiga yaqinlashmoqda",
        detail: `Yillik tushum ~${fmtSom(yearly)}, chegara ${fmtSom(limit)} (${Math.round(share * 100)}%)`,
        points: share >= 1 ? 18 : 10,
        tavsiya: "Chegaradan oshgan oydan keyin QQS va foyda solig'iga o'tish majburiy. Hisob siyosati, ESF va QQS hisobini oldindan tayyorlang (birinchi yil foyda solig'idan ozod).",
      });
    }
  }

  // ── Shartnomalar ────────────────────────────────────────────
  const active = input.leases.filter((l) => l.holati === "faol");
  const expired = active.filter((l) => daysBetween(parseIso(l.tugash), today) > 0);
  const expiring = active.filter((l) => {
    const n = daysBetween(today, parseIso(l.tugash));
    return n >= 0 && n <= 30;
  });
  if (expired.length) {
    add({
      code: "ijara_tugagan",
      group: "shartnoma",
      title: "Muddati tugagan ijara shartnomasi",
      detail: expired.map((l) => `№${l.raqam} (${l.tugash})`).join(", "),
      points: Math.min(16, expired.length * 8),
      tavsiya: "Shartnomani uzaytiring va ijara.soliq.uz'da ro'yxatdan o'tkazing, aks holda ijara xarajati chegirilmaydi.",
    });
  }
  if (expiring.length) {
    add({
      code: "ijara_tugayapti",
      group: "shartnoma",
      title: "30 kun ichida tugaydigan ijara",
      detail: expiring.map((l) => `№${l.raqam} (${l.tugash})`).join(", "),
      points: Math.min(8, expiring.length * 4),
      tavsiya: "Ijarachi bilan uzaytirish shartlarini oldindan kelishib oling.",
    });
  }

  // ── Ishchilar ───────────────────────────────────────────────
  if (input.workforce) {
    const w = input.workforce;
    if (w.active === 0) {
      add({
        code: "ishchi_yoq",
        group: "malumot",
        title: "Mehnat tizimida faol xodim yo'q",
        detail: "my.mehnat.uz bo'yicha korxonada rasmiylashtirilgan xodim ko'rinmayapti",
        points: 6,
        tavsiya: "Kamida rahbar mehnat shartnomasi bilan rasmiylashtirilgan bo'lishi kerak. Norasmiy bandlik uchun jarima va JShDS qo'shimcha hisoblanishi mumkin.",
      });
    }
    const t = turnover90(w);
    if (w.left90 >= 3 && t >= 0.2) {
      add({
        code: "ishchi_ketish",
        group: "moliya",
        title: "Xodimlarning ko'p ketishi",
        detail: `90 kunda ${w.left90} kishi ketdi (${Math.round(t * 100)}%), ${w.hired90} kishi keldi. Hozir ${w.active} kishi`,
        points: t >= 0.4 ? 10 : 5,
        tavsiya: "Ommaviy ketish faoliyat qisqarayotganini yoki ish haqi muammosini bildirishi mumkin. Ish haqi qarzi va hisob-kitoblarni tekshiring.",
      });
    }
  }

  // ── Bojxona ─────────────────────────────────────────────────
  if ((input.customsDebt ?? 0) > 0) {
    add({
      code: "bojxona_qarz",
      group: "soliq",
      title: "Bojxona to'lovlari bo'yicha qarz",
      detail: `Qarz: ${fmtSom(input.customsDebt!)} (dep.customs.uz qarzdorlar ro'yxati)`,
      points: 20,
      tavsiya: "Qarz yopilmaguncha tovarlarni rasmiylashtirish to'xtatilishi va penya hisoblanishi mumkin. To'lang va qarzdorlar ro'yxatidan chiqqaningizni tekshiring.",
    });
  }
  const tif = (input.contracts ?? []).filter((c) => c.holati === "faol").map((c) => ({ c, open: tifOpen(c), age: daysBetween(parseIso(c.ochiq_sana ?? c.sana), today) }));
  const tifLate = tif.filter((x) => x.open > 0 && x.age > TIF_SETTLE_DAYS);
  const tifNear = tif.filter((x) => x.open > 0 && x.age > TIF_SETTLE_DAYS - 30 && x.age <= TIF_SETTLE_DAYS);
  const what = (c: TifContract) => (c.turi === "eksport" ? "eksport tushumi kelmagan" : "import avansi qoplanmagan");
  if (tifLate.length) {
    add({
      code: "tif_muddati_otgan",
      group: "shartnoma",
      title: "Tashqi savdo: muddati o'tgan debitorlik",
      detail: tifLate.slice(0, 3).map(({ c, open, age }) => `№${c.raqam} (${c.kontragent || c.turi}): ${what(c)} ${fmtCur(open, c.valyuta)}, ${age} kun`).join("; "),
      points: Math.min(30, tifLate.length * 20),
      tavsiya: "Qoplanmagan summa uchun jarima qo'llanadi va korxona TIFning nohalol ishtirokchilari reyestriga kiritilishi mumkin. Kontragentdan tovar/pulni talab qiling yoki shartnoma muddatini contract.customs.uz'da uzaytiring.",
    });
  }
  if (tifNear.length) {
    add({
      code: "tif_muddat_yaqin",
      group: "shartnoma",
      title: `Tashqi savdo: ${TIF_SETTLE_DAYS} kunlik muddat yaqin`,
      detail: tifNear.slice(0, 3).map(({ c, open, age }) => `№${c.raqam}: ${what(c)} ${fmtCur(open, c.valyuta)}, ${TIF_SETTLE_DAYS - age} kun qoldi`).join("; "),
      points: Math.min(12, tifNear.length * 6),
      tavsiya: "Muddat tugashidan oldin tovar yetkazilishi (yoki pul tushishi) yoki shartnoma muddati uzaytirilishi kerak.",
    });
  }
  const tifExpired = tif.filter((x) => x.c.tugash && daysBetween(parseIso(x.c.tugash), today) > 0);
  if (tifExpired.length) {
    add({
      code: "tif_shartnoma_tugagan",
      group: "shartnoma",
      title: "Muddati tugagan TIF shartnomasi",
      detail: tifExpired.slice(0, 3).map(({ c }) => `№${c.raqam} (${c.tugash})`).join(", "),
      points: Math.min(10, tifExpired.length * 5),
      tavsiya: "Shartnoma bo'yicha hisob-kitob tugagan bo'lsa yoping, aks holda contract.customs.uz'da qo'shimcha kelishuv bilan uzaytiring.",
    });
  }

  // ── Ma'lumot sifati ─────────────────────────────────────────
  const lastEnd = last ? quarterEnd(last.davr) : null;
  if (!last || (lastEnd && daysBetween(lastEnd, today) > 200)) {
    add({
      code: "malumot_eski",
      group: "malumot",
      title: last ? "Moliyaviy ma'lumot eskirgan" : "Moliyaviy ma'lumot kiritilmagan",
      detail: last ? `Oxirgi kiritilgan davr: ${last.davr}` : "Balans va moliyaviy natijalar yo'q",
      points: 6,
      tavsiya: "Oxirgi chorak balansini kiriting yoki 1C'dan yuklang: moliyaviy risklar shu ma'lumotsiz hisoblanmaydi.",
    });
  }

  f.sort((a, b) => b.points - a.points);
  const byGroup = { soliq: 0, moliya: 0, rejim: 0, shartnoma: 0, malumot: 0 } as Record<RiskGroup, number>;
  for (const x of f) byGroup[x.group] += x.points;
  const score = Math.min(100, f.reduce((s, x) => s + x.points, 0));
  return { score, level: levelOf(score), factors: f, byGroup };
}
