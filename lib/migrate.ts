// Ilova ishga tushganda migrations/*.sql fayllarini tartib bilan bir marta bajaradi.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";
import { hashPassword } from "./password";
import { DEFAULT_TAX_TYPES } from "./tax-calendar";

export async function migrate(dir = path.join(process.cwd(), "migrations")) {
  const sql = db();
  await sql`SELECT pg_advisory_lock(727001)`;
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
    const done = new Set((await sql`SELECT name FROM schema_migrations`).map((r) => r.name as string));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const body = await readFile(path.join(dir, f), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO schema_migrations (name) VALUES (${f})`;
      });
      console.log(`[db] migratsiya bajarildi: ${f}`);
    }
    for (const t of DEFAULT_TAX_TYPES) {
      await sql`INSERT INTO tax_types ${sql(t, "code", "nomi", "davr", "oy_offset", "kun")} ON CONFLICT (code) DO NOTHING`;
    }
    await ensureAdmin();
  } finally {
    await sql`SELECT pg_advisory_unlock(727001)`;
  }
}

/** Foydalanuvchi bo'lmasa, ADMIN_LOGIN / ADMIN_PASSWORD dan birinchi rahbarni yaratadi */
async function ensureAdmin() {
  const sql = db();
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM users`;
  if (n > 0) return;
  const login = process.env.ADMIN_LOGIN || "admin";
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) {
    console.warn("[db] Foydalanuvchi yo'q va ADMIN_PASSWORD berilmagan — birinchi rahbar yaratilmadi");
    return;
  }
  await sql`INSERT INTO users (fio, login, pass_hash, role, lavozim) VALUES ('Rahbar', ${login}, ${await hashPassword(pass)}, 'admin', 'Rahbar')`;
  console.log(`[db] Birinchi rahbar yaratildi: login «${login}»`);
}
