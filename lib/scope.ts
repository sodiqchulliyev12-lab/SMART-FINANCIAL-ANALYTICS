import { db } from "./db";
import type { User } from "./auth";

/** Foydalanuvchi ko'ra oladigan faol korxonalar (forma select'lari uchun) */
export async function companyOptions(u: User): Promise<[string, string][]> {
  const sql = db();
  const rows = await sql<{ id: number; nomi: string }[]>`SELECT id, nomi FROM companies WHERE NOT arxiv
    ${u.role === "admin" ? sql`` : sql`AND masul_id = ${u.id}`} ORDER BY nomi`;
  return rows.map((r) => [String(r.id), r.nomi]);
}

/** SQL bo'lagi: korxona ko'rinishi cheklovi (c — companies aliasi) */
export function scopeSql(u: User) {
  const sql = db();
  return u.role === "admin" ? sql`AND NOT c.arxiv` : sql`AND NOT c.arxiv AND c.masul_id = ${u.id}`;
}
