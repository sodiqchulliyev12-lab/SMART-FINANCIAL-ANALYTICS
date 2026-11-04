// PostgreSQL ulanishi (Railway: DATABASE_URL avtomatik beriladi).
import postgres from "postgres";

declare global {
  // dev rejimida qayta yuklanishda ulanishlar ko'payib ketmasin
  var __sql: ReturnType<typeof postgres> | undefined;
}

function make() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL o'rnatilmagan (Railway → Variables)");
  return postgres(url, {
    max: Number(process.env.DB_POOL || 10),
    idle_timeout: 30,
    // NUMERIC ustunlar raqam bo'lib qaytsin (so'm summalari 2^53 dan ancha kichik)
    types: { numeric: { to: 1700, from: [1700], serialize: (v: number) => String(v), parse: (v: string) => Number(v) } },
    onnotice: () => {},
  });
}

export function db() {
  if (!globalThis.__sql) globalThis.__sql = make();
  return globalThis.__sql;
}

export async function setting(kalit: string, fallback = ""): Promise<string> {
  const rows = await db()`SELECT qiymat FROM settings WHERE kalit = ${kalit}`;
  return rows[0]?.qiymat ?? fallback;
}

export async function audit(userId: number | null, amal: string, obyekt: string, tafsilot?: unknown) {
  const sql = db();
  await sql`INSERT INTO audit_log (user_id, amal, obyekt, tafsilot) VALUES (${userId}, ${amal}, ${obyekt}, ${tafsilot ? sql.json(tafsilot as never) : null})`;
}
