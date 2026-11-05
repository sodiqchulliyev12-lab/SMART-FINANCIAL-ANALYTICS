// Namuna (demo) ma'lumotni o'chiradi va haqiqiy korxonalarni qo'shadi.
//   npm run demo:tozalash -- --tasdiq [korxonalar.json]
// korxonalar.json: [{ "nomi": "...", "stir": "123456789", "rejim": "qqs|soddalashtirilgan|aylanma", "faoliyat": "..." }]
// Admin hisobi va sozlamalar saqlanib qoladi.
import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { migrate } from "../lib/migrate";
import { generateDeadlines, recomputeRisk } from "../lib/data";
import { TAXES_BY_REGIME } from "../lib/tax-calendar";

const DEMO_STIR = ["305112233", "306223344", "307334455", "308445566", "309556677", "310667788", "311778899"];
const DEMO_LOGIN = ["dilnoza", "jasur"];

type Korxona = { nomi: string; stir: string; rejim: string; faoliyat?: string; direktor?: string; izoh?: string };

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--tasdiq")) {
    console.log("Ehtiyot chorasi: ishga tushirish uchun --tasdiq qo'shing.");
    return;
  }
  const file = args.find((a) => a.endsWith(".json"));
  const list: Korxona[] = file ? JSON.parse(readFileSync(file, "utf8")) : [];
  for (const k of list) {
    if (!k.nomi?.trim() || !/^\d{9}$/.test(k.stir ?? "") || !TAXES_BY_REGIME[k.rejim]) {
      throw new Error(`Noto'g'ri yozuv: ${JSON.stringify(k)} (STIR 9 raqam, rejim: ${Object.keys(TAXES_BY_REGIME).join(", ")})`);
    }
  }

  await migrate();
  const sql = db();
  await sql.begin(async (tx) => {
    const del = await tx`DELETE FROM companies WHERE stir IN ${tx(DEMO_STIR)} RETURNING nomi`;
    const users = await tx`DELETE FROM users WHERE login IN ${tx(DEMO_LOGIN)} AND role <> 'admin' RETURNING login`;
    await tx`DELETE FROM audit_log WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM users)`;
    console.log(`O'chirildi: ${del.length} ta demo korxona, ${users.length} ta demo xodim.`);
  });

  for (const k of list) {
    const row = { nomi: k.nomi.trim(), stir: k.stir, rejim: k.rejim, faoliyat: k.faoliyat ?? "", direktor: k.direktor ?? "", izoh: k.izoh ?? "" };
    const [c] = await sql`INSERT INTO companies ${sql(row)} ON CONFLICT (stir) DO UPDATE SET nomi = EXCLUDED.nomi RETURNING id`;
    await sql`INSERT INTO company_taxes ${sql(TAXES_BY_REGIME[k.rejim].map((soliq) => ({ company_id: c.id, soliq })))} ON CONFLICT DO NOTHING`;
    await generateDeadlines(undefined, c.id);
    await recomputeRisk(c.id);
    console.log(`Qo'shildi: ${row.nomi} (STIR ${row.stir})`);
  }
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM companies`;
  console.log(`Bazada hozir ${n} ta korxona.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db().end());
