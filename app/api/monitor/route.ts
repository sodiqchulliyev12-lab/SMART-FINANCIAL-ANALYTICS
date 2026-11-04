// Soliq Monitor (my.soliq.uz, Didox, ijara.soliq.uz'ni tekshiruvchi tashqi dastur) shu manzilga natija yuboradi.
// Avtorizatsiya: "Authorization: Bearer <MONITOR_KEY>". Korxona STIR bo'yicha topiladi.
import { timingSafeEqual } from "node:crypto";
import { audit, db } from "@/lib/db";
import { recomputeRisk } from "@/lib/data";
import { notifyNewLetters } from "@/bot/notify";

export const dynamic = "force-dynamic";

type Letter = { stir: string; tur?: string; raqam: string; sana: string; mazmun?: string; javob_muddati?: string | null };
type Ehf = { stir: string; raqam: string; kontragent?: string; kontragent_stir?: string; summa?: number; sana: string; yonalish?: string; holati?: string; xavfli?: boolean };
type Lease = { stir: string; raqam: string; tomon?: string; boshlanish: string; tugash: string; holati?: string };

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const s = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

function authorized(req: Request): boolean {
  const key = process.env.MONITOR_KEY || "";
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (key.length < 16 || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  let body: { letters?: Letter[]; ehf?: Ehf[]; leases?: Lease[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "JSON noto'g'ri" }, { status: 400 });
  }
  const sql = db();
  const companies = new Map((await sql`SELECT id, stir FROM companies WHERE NOT arxiv`).map((c) => [c.stir as string, c.id as number]));
  const touched = new Set<number>();
  const skipped: string[] = [];
  const newLetters: { company_id: number; tur: string; raqam: string; javob_muddati: string | null }[] = [];
  const cid = (stir: unknown) => {
    const id = companies.get(s(stir, 14).replace(/\D/g, ""));
    if (!id) skipped.push(s(stir, 14));
    return id;
  };

  for (const l of (body.letters ?? []).slice(0, 2000)) {
    const id = cid(l.stir);
    if (!id || !l.raqam || !isDate(l.sana)) continue;
    const jm = isDate(l.javob_muddati) ? l.javob_muddati : null;
    const [r] = await sql`INSERT INTO letters (company_id, tur, raqam, sana, mazmun, javob_muddati, manba)
      VALUES (${id}, ${s(l.tur, 60) || "Xat"}, ${s(l.raqam, 50)}, ${l.sana}, ${s(l.mazmun, 2000)}, ${jm}, 'monitor')
      ON CONFLICT (company_id, raqam) DO UPDATE SET tur = EXCLUDED.tur, mazmun = EXCLUDED.mazmun, javob_muddati = EXCLUDED.javob_muddati
      RETURNING (xmax = 0) AS inserted`;
    if (r.inserted) newLetters.push({ company_id: id, tur: s(l.tur, 60) || "Xat", raqam: s(l.raqam, 50), javob_muddati: jm });
    touched.add(id);
  }
  for (const e of (body.ehf ?? []).slice(0, 5000)) {
    const id = cid(e.stir);
    if (!id || !e.raqam || !isDate(e.sana)) continue;
    const holati = ["imzo_kutmoqda", "imzolandi", "rad"].includes(String(e.holati)) ? String(e.holati) : "imzo_kutmoqda";
    await sql`INSERT INTO ehf (company_id, raqam, kontragent, kontragent_stir, summa, sana, yonalish, holati, xavfli, manba)
      VALUES (${id}, ${s(e.raqam, 60)}, ${s(e.kontragent, 200) || "—"}, ${s(e.kontragent_stir, 14)}, ${Number(e.summa) || 0}, ${e.sana},
              ${e.yonalish === "chiquvchi" ? "chiquvchi" : "kiruvchi"}, ${holati}, ${Boolean(e.xavfli)}, 'monitor')
      ON CONFLICT (company_id, raqam) DO UPDATE SET holati = EXCLUDED.holati, xavfli = EXCLUDED.xavfli, summa = EXCLUDED.summa`;
    touched.add(id);
  }
  for (const l of (body.leases ?? []).slice(0, 2000)) {
    const id = cid(l.stir);
    if (!id || !l.raqam || !isDate(l.boshlanish) || !isDate(l.tugash)) continue;
    const holati = ["faol", "tugagan", "bekor"].includes(String(l.holati)) ? String(l.holati) : "faol";
    await sql`INSERT INTO leases (company_id, raqam, tomon, boshlanish, tugash, holati, manba)
      VALUES (${id}, ${s(l.raqam, 60)}, ${s(l.tomon, 200)}, ${l.boshlanish}, ${l.tugash}, ${holati}, 'monitor')
      ON CONFLICT (company_id, raqam) DO UPDATE SET tomon = EXCLUDED.tomon, boshlanish = EXCLUDED.boshlanish, tugash = EXCLUDED.tugash, holati = EXCLUDED.holati`;
    touched.add(id);
  }
  for (const id of touched) await recomputeRisk(id);
  await audit(null, "monitor", "api", { korxonalar: touched.size, yangi_xatlar: newLetters.length, topilmagan: [...new Set(skipped)].slice(0, 20) });
  if (newLetters.length) await notifyNewLetters(newLetters).catch((e) => console.error("[monitor] xabar yuborilmadi:", e));
  return Response.json({ ok: true, companies: touched.size, new_letters: newLetters.length, unknown_stir: [...new Set(skipped)] });
}
