// Namuna ma'lumot: saytni ko'rsatish va sinash uchun. Faqat bo'sh bazada ishlaydi (korxona bo'lmasa).
//   DATABASE_URL=... ADMIN_PASSWORD=... npm run seed:demo
import { db } from "../lib/db";
import { migrate } from "../lib/migrate";
import { generateDeadlines, recomputeAll } from "../lib/data";
import { hashPassword } from "../lib/password";
import { TAXES_BY_REGIME, addDays, iso, todayTashkent } from "../lib/tax-calendar";

const M = 1_000_000;

async function main() {
  await migrate();
  const sql = db();
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM companies`;
  if (n > 0) {
    console.log("Bazada korxonalar bor — namuna qo'shilmadi.");
    return;
  }
  const pass = await hashPassword("Demo12345");
  const staff = await sql`INSERT INTO users (fio, login, pass_hash, role, lavozim) VALUES
    ('Dilnoza Karimova', 'dilnoza', ${pass}, 'staff', 'Bosh buxgalter'),
    ('Jasur Toshmatov', 'jasur', ${pass}, 'staff', 'Buxgalter')
    ON CONFLICT (login) DO UPDATE SET fio = EXCLUDED.fio RETURNING id`;
  const [d, j] = staff.map((s) => s.id);
  const today = todayTashkent();
  const day = (n: number) => iso(addDays(today, n));

  const companies = [
    { nomi: "«Barakali Non» MChJ", stir: "305112233", rejim: "qqs", faoliyat: "Non mahsulotlari ishlab chiqarish", masul_id: d, profile: "healthy" },
    { nomi: "«Toshkent Savdo Invest» MChJ", stir: "306223344", rejim: "qqs", faoliyat: "Ulgurji savdo", masul_id: d, profile: "crisis" },
    { nomi: "«Ipak Yo'li Logistik» MChJ", stir: "307334455", rejim: "aylanma", faoliyat: "Yuk tashish", masul_id: j, profile: "threshold" },
    { nomi: "«Samarqand Qurilish» AJ", stir: "308445566", rejim: "qqs", faoliyat: "Qurilish", masul_id: j, profile: "taxdiscipline" },
    { nomi: "«Green Farm Agro» MChJ", stir: "309556677", rejim: "soddalashtirilgan", faoliyat: "Qishloq xo'jaligi", masul_id: d, profile: "healthy" },
    { nomi: "«Smart Kids» xususiy bog'cha", stir: "310667788", rejim: "aylanma", faoliyat: "Ta'lim", masul_id: j, profile: "lease" },
    { nomi: "«Nur Med Servis» MChJ", stir: "311778899", rejim: "qqs", faoliyat: "Tibbiy xizmatlar", masul_id: d, profile: "declining" },
  ];
  for (const c of companies) {
    const { profile, ...row } = c;
    const [{ id }] = await sql`INSERT INTO companies ${sql(row)} RETURNING id`;
    await sql`INSERT INTO company_taxes ${sql(TAXES_BY_REGIME[c.rejim].map((soliq) => ({ company_id: id, soliq })))}`;
    const q = ["2025-Q4", "2026-Q1", "2026-Q2", "2026-Q3"];
    const fin = (i: number, f: Record<string, number>) => ({
      company_id: id, davr: q[i], tushum: 900 * M, tannarx: 680 * M, sof_foyda: 55 * M, jami_aktiv: 1500 * M, joriy_aktiv: 820 * M,
      pul: 260 * M, debitorlik: 210 * M, zaxira: 230 * M, joriy_majburiyat: 420 * M, uzoq_majburiyat: 150 * M, kapital: 930 * M,
      kreditorlik: 260 * M, budjet_qarz: 0, soliq_tolangan: 48 * M, ...f,
    });
    let rows = q.map((_, i) => fin(i, { tushum: (850 + i * 40) * M }));
    if (profile === "crisis") rows = q.map((_, i) => fin(i, { tushum: [1400, 1250, 1100, 640][i] * M, tannarx: [1150, 1080, 990, 610][i] * M, sof_foyda: [20, -15, -40, -85][i] * M, joriy_aktiv: 520 * M, pul: 18 * M, joriy_majburiyat: 690 * M, kapital: [80, 40, 5, -60][i] * M, budjet_qarz: 74 * M, debitorlik: 330 * M, soliq_tolangan: 9 * M }));
    if (profile === "threshold") rows = q.map((_, i) => fin(i, { tushum: [1050, 1120, 1190, 1260][i] * M, soliq_tolangan: 0 }));
    if (profile === "declining") rows = q.map((_, i) => fin(i, { tushum: [980, 930, 870, 560][i] * M, sof_foyda: [60, 35, 12, -18][i] * M, pul: 70 * M, joriy_aktiv: 560 * M }));
    if (profile === "lease") rows = q.map((_, i) => fin(i, { tushum: 420 * M, tannarx: 300 * M, sof_foyda: 40 * M, soliq_tolangan: 17 * M }));
    // Bir yil oldingi choraklar — dashboarddagi «o'tgan yil» taqqoslovi uchun
    const hist = ["2024-Q4", "2025-Q1", "2025-Q2", "2025-Q3"].map((davr, i) => ({
      ...rows[0], davr, tushum: Math.round(rows[0].tushum * (0.8 + i * 0.04)), sof_foyda: Math.round(rows[0].sof_foyda * 0.9), soliq_tolangan: Math.round(rows[0].soliq_tolangan * (0.85 + i * 0.03)),
    }));
    for (const r of [...hist, ...rows]) await sql`INSERT INTO financials ${sql(r)}`;

    if (profile === "taxdiscipline" || profile === "crisis") {
      await sql`INSERT INTO letters (company_id, tur, raqam, sana, mazmun, javob_muddati, manba) VALUES
        (${id}, 'Talabnoma', ${"T-" + id + "1"}, ${day(-12)}, 'QQS hisobotidagi tafovut bo''yicha tushuntirish', ${day(-2)}, 'monitor'),
        (${id}, 'Elektron ogohlantirish', ${"EO-" + id}, ${day(-1)}, 'Xodimlar soni va ish haqi fondi bo''yicha', ${day(2)}, 'monitor')`;
      await sql`INSERT INTO ehf (company_id, raqam, kontragent, kontragent_stir, summa, sana, yonalish, holati, xavfli) VALUES
        (${id}, ${"F-" + id + "01"}, '«Oltin Kalit Trade» MChJ', '302998877', ${148 * M}, ${day(-9)}, 'kiruvchi', 'imzo_kutmoqda', TRUE),
        (${id}, ${"F-" + id + "02"}, '«Metall Servis» MChJ', '303887766', ${36 * M}, ${day(-7)}, 'kiruvchi', 'imzo_kutmoqda', FALSE)`;
    }
    if (profile === "lease") {
      await sql`INSERT INTO leases (company_id, raqam, tomon, boshlanish, tugash) VALUES
        (${id}, 'IJ-2025/114', 'Yakka tartibdagi tadbirkor A. Rahimov', ${day(-340)}, ${day(18)}),
        (${id}, 'IJ-2024/057', 'Mirzo Ulug''bek tumani hokimligi', ${day(-700)}, ${day(-6)})`;
    }
    if (profile === "healthy") {
      await sql`INSERT INTO ehf (company_id, raqam, kontragent, summa, sana, holati) VALUES (${id}, ${"F-" + id + "09"}, '«Un Zavodi» AJ', ${22 * M}, ${day(-1)}, 'imzo_kutmoqda')`;
    }
  }
  await generateDeadlines(today);
  // O'tgan muddatlarning ko'pchiligi topshirilgan; "taxdiscipline" va "crisis" korxonalarida bir nechtasi kechikkan
  await sql`UPDATE deadlines SET hisobot_holati = 'topshirildi', tolov_holati = 'tolandi'
    WHERE muddat < ${iso(today)} AND company_id NOT IN (SELECT id FROM companies WHERE stir IN ('306223344','308445566'))`;
  await sql`UPDATE deadlines SET hisobot_holati = 'topshirildi', tolov_holati = 'tolandi'
    WHERE muddat < ${day(-20)} AND company_id IN (SELECT id FROM companies WHERE stir IN ('306223344','308445566'))`;
  // Risk tarixi grafigi uchun o'tgan kunlar
  for (let i = 30; i >= 1; i -= 3) await recomputeAll(addDays(today, -i));
  await recomputeAll(today);
  console.log("Namuna ma'lumot qo'shildi. Xodim loginlari: dilnoza / jasur, parol: Demo12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db().end());
