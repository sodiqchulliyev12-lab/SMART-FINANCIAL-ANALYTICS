// Soliq Monitor (my.soliq.uz, Didox, ijara.soliq.uz va customs.uz saytlarini tekshiruvchi tashqi dastur) shu manzilga natija yuboradi.
// Avtorizatsiya: "Authorization: Bearer <MONITOR_KEY>". Korxona STIR bo'yicha topiladi.
import { createHash, timingSafeEqual } from "node:crypto";
import { audit, db } from "@/lib/db";
import { recomputeRisk } from "@/lib/data";
import { notifyNewLetters } from "@/bot/notify";

export const dynamic = "force-dynamic";

type Letter = { stir: string; tur?: string; raqam: string; sana: string; mazmun?: string; javob_muddati?: string | null };
type Ehf = { stir: string; raqam: string; kontragent?: string; kontragent_stir?: string; summa?: number; sana: string; yonalish?: string; holati?: string; xavfli?: boolean };
type Lease = { stir: string; raqam: string; tomon?: string; boshlanish: string; tugash: string; holati?: string };
type CustomsDebt = { stir: string; summa: number; tafsilot?: string; sana?: string };
type Contract = {
  stir: string; raqam: string; turi?: string; kontragent?: string; davlat?: string; valyuta?: string;
  summa?: number; tolangan?: number; yetkazilgan?: number; ochiq_sana?: string | null; sana: string; tugash?: string | null; holati?: string;
};
type Declaration = {
  stir: string; raqam: string; sana: string; rejim?: string; turi?: string; shartnoma?: string;
  valyuta?: string; summa?: number; boj_tolov?: number; holati?: string;
};
type AiSoliqIn = { stir: string; sana?: string; reyting?: string; qarz?: number; kamchiliklar?: string[]; avtokameral?: string[]; ehf_xavfli?: number; imtiyozlar?: string[] };
type Worker = { stir: string; jshshir?: string; fio?: string; lavozim?: string; shartnoma?: string; kirgan: string; ketgan?: string | null };
/** JShShIR saqlanmaydi: korxona ichida takrorlanmas kalit sifatida faqat xeshi olinadi */
const workerKey = (w: Worker) => createHash("sha256").update(`${s(w.jshshir, 20).replace(/\D/g, "") || `${s(w.fio, 200).toLowerCase()}|${w.kirgan}`}`).digest("hex").slice(0, 32);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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
  let body: {
    letters?: Letter[]; ehf?: Ehf[]; leases?: Lease[];
    bojxona_qarz?: CustomsDebt[]; tif_shartnomalar?: Contract[]; deklaratsiyalar?: Declaration[]; xodimlar?: Worker[]; ai_soliq?: AiSoliqIn[];
  };
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
  // Bojxona: qarz (summa 0 = qarz yo'q, ya'ni tekshirildi va toza)
  for (const d of (body.bojxona_qarz ?? []).slice(0, 2000)) {
    const id = cid(d.stir);
    if (!id) continue;
    const sana = isDate(d.sana) ? d.sana : new Date().toISOString().slice(0, 10);
    await sql`INSERT INTO customs_debts (company_id, summa, tafsilot, tekshirildi, manba)
      VALUES (${id}, ${Math.max(0, num(d.summa))}, ${s(d.tafsilot, 1000)}, ${sana}, 'monitor')
      ON CONFLICT (company_id) DO UPDATE SET summa = EXCLUDED.summa, tafsilot = EXCLUDED.tafsilot, tekshirildi = EXCLUDED.tekshirildi, manba = 'monitor'`;
    touched.add(id);
  }
  for (const c of (body.tif_shartnomalar ?? []).slice(0, 5000)) {
    const id = cid(c.stir);
    if (!id || !c.raqam || !isDate(c.sana)) continue;
    const holati = ["faol", "yopilgan", "bekor"].includes(String(c.holati)) ? String(c.holati) : "faol";
    const row = {
      company_id: id, raqam: s(c.raqam, 60), turi: c.turi === "eksport" ? "eksport" : "import",
      kontragent: s(c.kontragent, 200), davlat: s(c.davlat, 60), valyuta: s(c.valyuta, 3).toUpperCase() || "USD",
      summa: num(c.summa), tolangan: num(c.tolangan), yetkazilgan: num(c.yetkazilgan),
      ochiq_sana: isDate(c.ochiq_sana) ? c.ochiq_sana : null, sana: c.sana, tugash: isDate(c.tugash) ? c.tugash : null, holati, manba: "monitor",
    };
    const { company_id: _c, raqam: _r, ...upd } = row;
    await sql`INSERT INTO customs_contracts ${sql(row)} ON CONFLICT (company_id, raqam) DO UPDATE SET ${sql(upd)}`;
    touched.add(id);
  }
  for (const d of (body.deklaratsiyalar ?? []).slice(0, 10000)) {
    const id = cid(d.stir);
    if (!id || !d.raqam || !isDate(d.sana)) continue;
    const row = {
      company_id: id, raqam: s(d.raqam, 60), sana: d.sana, rejim: s(d.rejim, 20),
      turi: ["import", "eksport"].includes(String(d.turi)) ? String(d.turi) : "boshqa", shartnoma: s(d.shartnoma, 60),
      valyuta: s(d.valyuta, 3).toUpperCase() || "USD", summa: num(d.summa), boj_tolov: num(d.boj_tolov),
      holati: s(d.holati, 40) || "rasmiylashtirildi", manba: "monitor",
    };
    const { company_id: _c, raqam: _r, ...upd } = row;
    await sql`INSERT INTO customs_declarations ${sql(row)} ON CONFLICT (company_id, raqam) DO UPDATE SET ${sql(upd)}`;
    touched.add(id);
  }

  for (const w of (body.xodimlar ?? []).slice(0, 20000)) {
    const id = cid(w.stir);
    if (!id || !isDate(w.kirgan)) continue;
    const row = {
      company_id: id, kalit: workerKey(w), fio: s(w.fio, 200), lavozim: s(w.lavozim, 200), shartnoma: s(w.shartnoma, 60),
      kirgan: w.kirgan, ketgan: isDate(w.ketgan) ? w.ketgan : null, manba: "monitor",
    };
    const { company_id: _c, kalit: _k, ...upd } = row;
    await sql`INSERT INTO workers ${sql(row)} ON CONFLICT (company_id, kalit) DO UPDATE SET ${sql(upd)}`;
    touched.add(id);
  }

  // ai.soliq.uz: Ekspress audit, AI Avtokameral, AI EHF, AI Reyting, AI Imtiyoz xulosalari (korxona bo'yicha oxirgi holat)
  const list = (v: unknown, n = 30) => (Array.isArray(v) ? v.map((x) => s(x, 500)).filter(Boolean).slice(0, n) : []);
  for (const a of (body.ai_soliq ?? []).slice(0, 2000)) {
    const id = cid(a.stir);
    if (!id) continue;
    const row = {
      company_id: id, sana: isDate(a.sana) ? a.sana : new Date().toISOString().slice(0, 10), reyting: s(a.reyting, 20),
      qarz: Math.max(0, num(a.qarz)), kamchiliklar: sql.json(list(a.kamchiliklar)), avtokameral: sql.json(list(a.avtokameral)),
      ehf_xavfli: Math.max(0, Math.round(num(a.ehf_xavfli))), imtiyozlar: sql.json(list(a.imtiyozlar)), yangilangan: new Date(),
    };
    const { company_id: _c, ...upd } = row;
    await sql`INSERT INTO ai_soliq ${sql(row)} ON CONFLICT (company_id) DO UPDATE SET ${sql(upd)}`;
    touched.add(id);
  }

  for (const id of touched) await recomputeRisk(id);
  await audit(null, "monitor", "api", { korxonalar: touched.size, yangi_xatlar: newLetters.length, topilmagan: [...new Set(skipped)].slice(0, 20) });
  if (newLetters.length) await notifyNewLetters(newLetters).catch((e) => console.error("[monitor] xabar yuborilmadi:", e));
  return Response.json({ ok: true, companies: touched.size, new_letters: newLetters.length, unknown_stir: [...new Set(skipped)] });
}
