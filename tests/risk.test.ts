import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRisk, levelOf, type RiskInput } from "../lib/risk";
import { parseIso } from "../lib/tax-calendar";
import { base } from "./fixtures";

const empty = (over: Partial<RiskInput> = {}): RiskInput => ({
  today: parseIso("2026-11-04"), regime: "qqs", bhm: 412000, deadlines: [], letters: [], ehf: [], leases: [],
  financials: [{ ...base, davr: "2026-Q3" }], ...over,
});

test("sog'lom korxona — past risk", () => {
  const r = assessRisk(empty());
  assert.equal(r.score, 0);
  assert.equal(r.level, "past");
});

test("kechikkan hisobot va javobsiz xat ballni oshiradi", () => {
  const r = assessRisk(empty({
    deadlines: [{ soliq: "QQS", davr: "2026-09", muddat: "2026-10-20", hisobot_holati: "kutilmoqda", tolov_holati: "kutilmoqda" }],
    letters: [{ raqam: "15", tur: "Talabnoma", javob_muddati: "2026-11-01", holati: "yangi" }],
  }));
  assert.deepEqual(r.factors.map((f) => f.code).sort(), ["hisobot_kechikdi", "xat_javobsiz"]);
  assert.equal(r.score, 27);
  assert.equal(r.level, "orta");
});

test("moliyaviy inqiroz belgilari", () => {
  const r = assessRisk(empty({
    financials: [
      { ...base, davr: "2026-Q2", sof_foyda: -10_000_000 },
      { ...base, davr: "2026-Q3", tushum: 500_000_000, sof_foyda: -50_000_000, kapital: -20_000_000, joriy_aktiv: 200_000_000, pul: 5_000_000, budjet_qarz: 30_000_000 },
    ],
  }));
  const codes = r.factors.map((f) => f.code);
  for (const c of ["kapital_manfiy", "likvidlik_past", "pul_kam", "zarar", "tushum_tushdi", "budjet_qarz"]) assert.ok(codes.includes(c), c);
  assert.equal(r.level, "kritik");
  assert.ok(r.score <= 100);
});

test("aylanma rejimda 5 mlrd chegaraga yaqinlashish", () => {
  const q = (d: string) => ({ ...base, davr: d, tushum: 1_150_000_000, soliq_tolangan: 0 });
  const r = assessRisk(empty({ regime: "aylanma", financials: [q("2025-Q4"), q("2026-Q1"), q("2026-Q2"), q("2026-Q3")] }));
  const f = r.factors.find((x) => x.code === "aylanma_chegara");
  assert.ok(f);
  assert.equal(f!.points, 10); // 4,6 mlrd / 4,944 mlrd ≈ 93%
  assert.ok(!r.factors.some((x) => x.code === "soliq_yuki_past"), "aylanmada soliq yuki omili ishlatilmaydi");
});

test("ijara va EHF omillari, ma'lumot eskirgan", () => {
  const r = assessRisk(empty({
    financials: [{ ...base, davr: "2025-Q4" }],
    leases: [{ raqam: "A1", tugash: "2026-11-20", holati: "faol" }, { raqam: "A2", tugash: "2026-10-01", holati: "faol" }],
    ehf: [
      { raqam: "1", kontragent: "X MChJ", sana: "2026-10-01", holati: "imzo_kutmoqda", yonalish: "kiruvchi", xavfli: true, summa: 1e7 },
    ],
  }));
  const codes = r.factors.map((f) => f.code);
  for (const c of ["ijara_tugagan", "ijara_tugayapti", "ehf_imzosiz", "ehf_xavfli", "malumot_eski"]) assert.ok(codes.includes(c), c);
});

test("daraja chegaralari", () => {
  assert.equal(levelOf(24), "past");
  assert.equal(levelOf(25), "orta");
  assert.equal(levelOf(50), "yuqori");
  assert.equal(levelOf(75), "kritik");
});

test("bojxona: qarz va 180 kunlik TIF debitorligi", () => {
  const c = (o: Partial<import("../lib/risk").TifContract>) => ({
    raqam: "K1", turi: "import", kontragent: "Foreign LLC", valyuta: "USD", summa: 100000, tolangan: 50000, yetkazilgan: 20000,
    sana: "2026-01-10", ochiq_sana: null, tugash: null, holati: "faol", ...o,
  });
  const r = assessRisk(empty({
    customsDebt: 3_500_000,
    contracts: [
      c({}), // import, 30 000 USD qoplanmagan, 298 kun
      c({ raqam: "K2", turi: "eksport", tolangan: 10000, yetkazilgan: 10000, sana: "2026-01-01" }), // qoplangan
      c({ raqam: "K3", turi: "eksport", tolangan: 0, yetkazilgan: 5000, sana: "2026-05-01", ochiq_sana: "2026-05-20" }), // 168 kun
      c({ raqam: "K4", tolangan: 0, yetkazilgan: 0, sana: "2025-12-01", tugash: "2026-10-31" }), // tugagan
    ],
  }));
  const codes = r.factors.map((f) => f.code);
  for (const x of ["bojxona_qarz", "tif_muddati_otgan", "tif_muddat_yaqin", "tif_shartnoma_tugagan"]) assert.ok(codes.includes(x), x);
  const late = r.factors.find((f) => f.code === "tif_muddati_otgan")!;
  assert.equal(late.points, 20, "faqat K1 muddati o'tgan");
  assert.match(late.detail, /30\s000 USD/);
});

test("statistika hisobotlari: alohida omil, soliq omiliga qo'shilmaydi", () => {
  const r = assessRisk(empty({
    deadlines: [
      { soliq: "4-mehnat (choraklik)", turi: "statistika", davr: "2026-Q3", muddat: "2026-10-06", hisobot_holati: "kutilmoqda", tolov_holati: "yoq" },
      { soliq: "12-korxona (oylik)", turi: "statistika", davr: "2026-10", muddat: "2026-11-05", hisobot_holati: "kutilmoqda", tolov_holati: "yoq" },
    ],
  }));
  const codes = r.factors.map((f) => f.code);
  assert.ok(codes.includes("stat_kechikdi"));
  assert.ok(codes.includes("stat_yaqin"));
  assert.ok(!codes.includes("hisobot_kechikdi"));
  assert.equal(r.factors.find((f) => f.code === "stat_kechikdi")!.points, 8);
});
