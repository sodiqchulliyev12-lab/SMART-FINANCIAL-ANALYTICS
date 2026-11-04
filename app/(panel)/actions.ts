"use server";
// Barcha yozish amallari. Har biri: kim kirganini va korxonaga ruxsatini tekshiradi, yozadi, jurnalga qayd qiladi,
// tegishli korxona riskini qayta hisoblaydi.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canSeeCompany, requireAdmin, requireUser, type User } from "@/lib/auth";
import { audit, db } from "@/lib/db";
import { generateDeadlines, recomputeRisk } from "@/lib/data";
import { FIN_FIELDS } from "@/lib/finance";
import { parseMoney } from "@/lib/format";
import { hashPassword, passwordProblem } from "@/lib/password";
import { TAXES_BY_REGIME, REGIMES } from "@/lib/tax-calendar";
import { randomInt } from "node:crypto";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const int = (f: FormData, k: string) => {
  const n = Number(f.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};
const date = (f: FormData, k: string) => {
  const v = str(f, k, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

function back(path: string, msg: { ok?: string; xato?: string }): never {
  const q = msg.ok ? `ok=${encodeURIComponent(msg.ok)}` : `xato=${encodeURIComponent(msg.xato ?? "")}`;
  redirect(`${path}${path.includes("?") ? "&" : "?"}${q}`);
}

async function companyGuard(u: User, companyId: number | null, path: string): Promise<number> {
  if (!companyId || !(await canSeeCompany(u, companyId))) back(path, { xato: "Korxona topilmadi yoki ruxsat yo'q" });
  return companyId;
}

async function afterChange(companyId: number, ...paths: string[]) {
  await recomputeRisk(companyId);
  for (const p of ["/", `/korxonalar/${companyId}/`, ...paths]) revalidatePath(p);
}

// ── Korxonalar ─────────────────────────────────────────────
export async function saveCompany(f: FormData) {
  const u = await requireAdmin();
  const id = int(f, "id");
  const path = id ? `/korxonalar/${id}/` : "/korxonalar/";
  const nomi = str(f, "nomi", 200);
  const stir = str(f, "stir", 14).replace(/\D/g, "");
  const rejim = str(f, "rejim");
  if (!nomi) back(path, { xato: "Korxona nomini kiriting" });
  if (!/^\d{9}$|^\d{14}$/.test(stir)) back(path, { xato: "STIR 9 xonali (yoki JShShIR 14 xonali) bo'lsin" });
  if (!(rejim in REGIMES)) back(path, { xato: "Soliq rejimini tanlang" });
  const row = {
    nomi, stir, rejim,
    faoliyat: str(f, "faoliyat", 200), direktor: str(f, "direktor", 200), telefon: str(f, "telefon", 40),
    bank: str(f, "bank", 200), hisob_raqam: str(f, "hisob_raqam", 30).replace(/\s/g, ""), izoh: str(f, "izoh", 2000),
    masul_id: int(f, "masul_id"),
  };
  const sql = db();
  let cid = id;
  try {
    if (id) {
      await sql`UPDATE companies SET ${sql(row)} WHERE id = ${id}`;
    } else {
      const [c] = await sql`INSERT INTO companies ${sql(row)} RETURNING id`;
      cid = c.id;
      const taxes = TAXES_BY_REGIME[rejim] ?? [];
      if (taxes.length) await sql`INSERT INTO company_taxes ${sql(taxes.map((soliq) => ({ company_id: c.id, soliq })))} ON CONFLICT DO NOTHING`;
    }
  } catch (e) {
    if (String(e).includes("companies_stir_key")) back(path, { xato: "Bu STIR bilan korxona allaqachon bor" });
    throw e;
  }
  await audit(u.id, id ? "tahrirlash" : "qo'shish", `companies:${cid}`, row);
  await generateDeadlines(undefined, cid!);
  await afterChange(cid!, "/korxonalar/", "/muddatlar/");
  back(`/korxonalar/${cid}/`, { ok: id ? "Saqlandi" : "Korxona qo'shildi, soliq muddatlari yaratildi" });
}

export async function setCompanyTaxes(f: FormData) {
  const u = await requireAdmin();
  const id = int(f, "id");
  const path = `/korxonalar/${id}/`;
  if (!id) back("/korxonalar/", { xato: "Korxona topilmadi" });
  const codes = f.getAll("soliq").map(String);
  const sql = db();
  await sql.begin(async (tx) => {
    await tx`DELETE FROM company_taxes WHERE company_id = ${id}`;
    if (codes.length) await tx`INSERT INTO company_taxes ${tx(codes.map((soliq) => ({ company_id: id, soliq })))} ON CONFLICT DO NOTHING`;
    await tx`DELETE FROM deadlines WHERE company_id = ${id} AND hisobot_holati = 'kutilmoqda' AND NOT (soliq = ANY(${codes}))`;
  });
  await audit(u.id, "soliqlar", `companies:${id}`, codes);
  await generateDeadlines(undefined, id);
  await afterChange(id, "/muddatlar/");
  back(path, { ok: "Hisobotlar ro'yxati yangilandi" });
}

export async function archiveCompany(f: FormData) {
  const u = await requireAdmin();
  const id = int(f, "id");
  const arxiv = str(f, "arxiv") === "1";
  await db()`UPDATE companies SET arxiv = ${arxiv} WHERE id = ${id}`;
  await audit(u.id, arxiv ? "arxivlash" : "tiklash", `companies:${id}`);
  revalidatePath("/korxonalar/");
  revalidatePath("/");
  back(`/korxonalar/${id}/`, { ok: arxiv ? "Arxivga o'tkazildi" : "Arxivdan tiklandi" });
}

// ── Moliyaviy ko'rsatkichlar ───────────────────────────────
export async function saveFinancials(f: FormData) {
  const u = await requireUser();
  const cid = await companyGuard(u, int(f, "company_id"), "/korxonalar/");
  const path = `/korxonalar/${cid}/`;
  const davr = str(f, "davr", 7);
  if (!/^\d{4}-Q[1-4]$/.test(davr)) back(path, { xato: "Davrni tanlang (masalan 2026-Q3)" });
  const row: Record<string, number | string> = { company_id: cid, davr };
  for (const { key, label } of FIN_FIELDS) {
    const v = parseMoney(f.get(key));
    if (Number.isNaN(v)) back(path, { xato: `«${label}» noto'g'ri kiritilgan` });
    row[key] = v;
  }
  const sql = db();
  const cols = ["company_id", "davr", ...FIN_FIELDS.map((x) => x.key)];
  await sql`INSERT INTO financials ${sql(row, cols)} ON CONFLICT (company_id, davr) DO UPDATE SET
    ${sql(Object.fromEntries(FIN_FIELDS.map((x) => [x.key, row[x.key]])))}, updated_at = now()`;
  await audit(u.id, "moliya", `companies:${cid}`, row);
  await afterChange(cid);
  back(path + "#moliya", { ok: `${davr} ma'lumotlari saqlandi, risk qayta hisoblandi` });
}

/** 1C yoki Excel'dan nusxalangan CSV: davr;tushum;tannarx;... (sarlavha qatori bilan) */
export async function importFinancials(f: FormData) {
  const u = await requireUser();
  const cid = await companyGuard(u, int(f, "company_id"), "/korxonalar/");
  const path = `/korxonalar/${cid}/`;
  const text = str(f, "csv", 200_000);
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) back(path, { xato: "Sarlavha va kamida bitta qator kerak" });
  const sep = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const unq = (c: string) => c.trim().replace(/^"(.*)"$/, "$1").trim();
  const head = lines[0].split(sep).map((h) => unq(h).toLowerCase());
  const known = new Set(["davr", ...FIN_FIELDS.map((x) => x.key)]);
  const unknown = head.filter((h) => !known.has(h));
  if (!head.includes("davr")) back(path, { xato: "Birinchi qatorda «davr» ustuni bo'lsin" });
  if (unknown.length) back(path, { xato: `Noma'lum ustunlar: ${unknown.join(", ")}` });
  const sql = db();
  let n = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map(unq);
    const row: Record<string, number | string> = { company_id: cid };
    head.forEach((h, i) => {
      row[h] = h === "davr" ? cells[i]?.trim() ?? "" : parseMoney(cells[i] ?? "");
    });
    if (!/^\d{4}-Q[1-4]$/.test(String(row.davr))) back(path, { xato: `Noto'g'ri davr: «${row.davr}» (2026-Q3 shaklida bo'lsin)` });
    if (Object.values(row).some((v) => typeof v === "number" && Number.isNaN(v))) back(path, { xato: `${row.davr}: raqam noto'g'ri` });
    const upd = Object.fromEntries(head.filter((h) => h !== "davr").map((h) => [h, row[h]]));
    await sql`INSERT INTO financials ${sql(row)} ON CONFLICT (company_id, davr) DO UPDATE SET ${sql(upd)}, updated_at = now()`;
    n++;
  }
  await audit(u.id, "moliya_import", `companies:${cid}`, { qatorlar: n });
  await afterChange(cid);
  back(path + "#moliya", { ok: `${n} ta davr yuklandi` });
}

// ── Muddatlar ──────────────────────────────────────────────
export async function markDeadline(f: FormData) {
  const u = await requireUser();
  const id = int(f, "id");
  const back_ = str(f, "back") || "/muddatlar/";
  const [d] = await db()`SELECT company_id FROM deadlines WHERE id = ${id}`;
  const cid = await companyGuard(u, d?.company_id ?? null, back_);
  const field = str(f, "field");
  const value = str(f, "value");
  const allowed: Record<string, string[]> = { hisobot_holati: ["kutilmoqda", "topshirildi"], tolov_holati: ["kutilmoqda", "tolandi", "yoq"] };
  if (!allowed[field]?.includes(value)) back(back_, { xato: "Noto'g'ri amal" });
  const sql = db();
  await sql`UPDATE deadlines SET ${sql({ [field]: value })}, belgiladi_id = ${u.id}, belgi_vaqt = now() WHERE id = ${id}`;
  await audit(u.id, "muddat", `deadlines:${id}`, { [field]: value });
  await afterChange(cid, "/muddatlar/");
  back(back_, { ok: "Belgilandi" });
}

// ── Soliq xatlari, EHF, ijara ──────────────────────────────
export async function addLetter(f: FormData) {
  const u = await requireUser();
  const cid = await companyGuard(u, int(f, "company_id"), "/xatlar/");
  const raqam = str(f, "raqam", 50);
  const sana = date(f, "sana");
  if (!raqam || !sana) back("/xatlar/", { xato: "Raqam va sanani kiriting" });
  const row = { company_id: cid, tur: str(f, "tur", 60) || "Xat", raqam, sana, mazmun: str(f, "mazmun", 2000), javob_muddati: date(f, "javob_muddati") };
  const sql = db();
  await sql`INSERT INTO letters ${sql(row)} ON CONFLICT (company_id, raqam) DO UPDATE SET tur = EXCLUDED.tur, sana = EXCLUDED.sana, mazmun = EXCLUDED.mazmun, javob_muddati = EXCLUDED.javob_muddati`;
  await audit(u.id, "xat", `companies:${cid}`, row);
  await afterChange(cid, "/xatlar/");
  back("/xatlar/", { ok: "Xat ro'yxatga olindi" });
}

export async function setLetterStatus(f: FormData) {
  const u = await requireUser();
  const id = int(f, "id");
  const holati = str(f, "holati");
  if (!["yangi", "javob_berildi", "yopildi"].includes(holati)) back("/xatlar/", { xato: "Noto'g'ri holat" });
  const [l] = await db()`SELECT company_id FROM letters WHERE id = ${id}`;
  const cid = await companyGuard(u, l?.company_id ?? null, "/xatlar/");
  await db()`UPDATE letters SET holati = ${holati} WHERE id = ${id}`;
  await audit(u.id, "xat_holat", `letters:${id}`, { holati });
  await afterChange(cid, "/xatlar/");
  back(str(f, "back") || "/xatlar/", { ok: "Holat yangilandi" });
}

export async function addEhf(f: FormData) {
  const u = await requireUser();
  const cid = await companyGuard(u, int(f, "company_id"), "/ehf/");
  const raqam = str(f, "raqam", 60);
  const sana = date(f, "sana");
  const summa = parseMoney(f.get("summa"));
  if (!raqam || !sana || Number.isNaN(summa)) back("/ehf/", { xato: "Raqam, sana va summani to'g'ri kiriting" });
  const row = {
    company_id: cid, raqam, sana, summa,
    kontragent: str(f, "kontragent", 200) || "—", kontragent_stir: str(f, "kontragent_stir", 14).replace(/\D/g, ""),
    yonalish: str(f, "yonalish") === "chiquvchi" ? "chiquvchi" : "kiruvchi", xavfli: f.get("xavfli") === "on",
  };
  const sql = db();
  await sql`INSERT INTO ehf ${sql(row)} ON CONFLICT (company_id, raqam) DO NOTHING`;
  await audit(u.id, "ehf", `companies:${cid}`, row);
  await afterChange(cid, "/ehf/");
  back("/ehf/", { ok: "EHF qo'shildi" });
}

export async function setEhfStatus(f: FormData) {
  const u = await requireUser();
  const id = int(f, "id");
  const holati = str(f, "holati");
  const [e] = await db()`SELECT company_id FROM ehf WHERE id = ${id}`;
  const cid = await companyGuard(u, e?.company_id ?? null, "/ehf/");
  if (holati === "xavfli" || holati === "xavfsiz") {
    await db()`UPDATE ehf SET xavfli = ${holati === "xavfli"} WHERE id = ${id}`;
  } else if (["imzo_kutmoqda", "imzolandi", "rad"].includes(holati)) {
    await db()`UPDATE ehf SET holati = ${holati} WHERE id = ${id}`;
  } else back("/ehf/", { xato: "Noto'g'ri holat" });
  await audit(u.id, "ehf_holat", `ehf:${id}`, { holati });
  await afterChange(cid, "/ehf/");
  back(str(f, "back") || "/ehf/", { ok: "Yangilandi" });
}

export async function addLease(f: FormData) {
  const u = await requireUser();
  const cid = await companyGuard(u, int(f, "company_id"), "/ijara/");
  const raqam = str(f, "raqam", 60);
  const boshlanish = date(f, "boshlanish");
  const tugash = date(f, "tugash");
  if (!raqam || !boshlanish || !tugash) back("/ijara/", { xato: "Raqam va sanalarni kiriting" });
  if (tugash < boshlanish) back("/ijara/", { xato: "Tugash sanasi boshlanishdan oldin bo'lmasin" });
  const row = { company_id: cid, raqam, tomon: str(f, "tomon", 200), boshlanish, tugash };
  const sql = db();
  await sql`INSERT INTO leases ${sql(row)} ON CONFLICT (company_id, raqam) DO UPDATE SET tomon = EXCLUDED.tomon, boshlanish = EXCLUDED.boshlanish, tugash = EXCLUDED.tugash`;
  await audit(u.id, "ijara", `companies:${cid}`, row);
  await afterChange(cid, "/ijara/");
  back("/ijara/", { ok: "Shartnoma saqlandi" });
}

export async function setLeaseStatus(f: FormData) {
  const u = await requireUser();
  const id = int(f, "id");
  const holati = str(f, "holati");
  if (!["faol", "tugagan", "bekor"].includes(holati)) back("/ijara/", { xato: "Noto'g'ri holat" });
  const [l] = await db()`SELECT company_id FROM leases WHERE id = ${id}`;
  const cid = await companyGuard(u, l?.company_id ?? null, "/ijara/");
  await db()`UPDATE leases SET holati = ${holati} WHERE id = ${id}`;
  await audit(u.id, "ijara_holat", `leases:${id}`, { holati });
  await afterChange(cid, "/ijara/");
  back("/ijara/", { ok: "Yangilandi" });
}

// ── Bojxona ────────────────────────────────────────────────
export async function saveCustomsDebt(f: FormData) {
  const u = await requireUser();
  const cid = await companyGuard(u, int(f, "company_id"), "/bojxona/");
  const summa = parseMoney(f.get("summa"));
  if (Number.isNaN(summa) || summa < 0) back("/bojxona/", { xato: "Qarz summasini to'g'ri kiriting (qarz yo'q bo'lsa 0)" });
  const row = { company_id: cid, summa, tafsilot: str(f, "tafsilot", 1000), tekshirildi: new Date().toISOString().slice(0, 10), manba: "qolda" };
  const sql = db();
  await sql`INSERT INTO customs_debts ${sql(row)} ON CONFLICT (company_id) DO UPDATE SET summa = EXCLUDED.summa, tafsilot = EXCLUDED.tafsilot, tekshirildi = EXCLUDED.tekshirildi, manba = 'qolda'`;
  await audit(u.id, "bojxona_qarz", `companies:${cid}`, { summa });
  await afterChange(cid, "/bojxona/");
  back("/bojxona/", { ok: "Bojxona qarzi saqlandi" });
}

export async function saveContract(f: FormData) {
  const u = await requireUser();
  const cid = await companyGuard(u, int(f, "company_id"), "/bojxona/");
  const raqam = str(f, "raqam", 60);
  const sana = date(f, "sana");
  if (!raqam || !sana) back("/bojxona/", { xato: "Shartnoma raqami va sanasini kiriting" });
  const money = ["summa", "tolangan", "yetkazilgan"].map((k) => parseMoney(f.get(k)));
  if (money.some((v) => Number.isNaN(v) || v < 0)) back("/bojxona/", { xato: "Summalarni to'g'ri kiriting" });
  const row = {
    company_id: cid, raqam, turi: str(f, "turi") === "eksport" ? "eksport" : "import",
    kontragent: str(f, "kontragent", 200), davlat: str(f, "davlat", 60), valyuta: (str(f, "valyuta", 3) || "USD").toUpperCase(),
    summa: money[0], tolangan: money[1], yetkazilgan: money[2], ochiq_sana: date(f, "ochiq_sana"), sana, tugash: date(f, "tugash"),
  };
  const { company_id: _c, raqam: _r, ...upd } = row;
  const sql = db();
  await sql`INSERT INTO customs_contracts ${sql(row)} ON CONFLICT (company_id, raqam) DO UPDATE SET ${sql(upd)}`;
  await audit(u.id, "tif_shartnoma", `companies:${cid}`, row);
  await afterChange(cid, "/bojxona/");
  back("/bojxona/", { ok: "Shartnoma saqlandi" });
}

export async function setContractStatus(f: FormData) {
  const u = await requireUser();
  const id = int(f, "id");
  const holati = str(f, "holati");
  if (!["faol", "yopilgan", "bekor"].includes(holati)) back("/bojxona/", { xato: "Noto'g'ri holat" });
  const [c] = await db()`SELECT company_id FROM customs_contracts WHERE id = ${id}`;
  const cid = await companyGuard(u, c?.company_id ?? null, "/bojxona/");
  await db()`UPDATE customs_contracts SET holati = ${holati} WHERE id = ${id}`;
  await audit(u.id, "tif_holat", `customs_contracts:${id}`, { holati });
  await afterChange(cid, "/bojxona/");
  back("/bojxona/", { ok: "Yangilandi" });
}

// ── Xodimlar ───────────────────────────────────────────────
export async function saveUser(f: FormData) {
  const u = await requireAdmin();
  const id = int(f, "id");
  const fio = str(f, "fio", 200);
  const login = str(f, "login", 60).toLowerCase();
  const role = str(f, "role") === "admin" ? "admin" : "staff";
  const pass = String(f.get("parol") ?? "");
  if (!fio || !/^[a-z0-9._-]{3,60}$/.test(login)) back("/xodimlar/", { xato: "F.I.Sh. va login (lotin harf/raqam, kamida 3 belgi) kiriting" });
  const sql = db();
  try {
    if (id) {
      if (id === u.id && role !== "admin") back("/xodimlar/", { xato: "O'zingizni rahbariyatdan chiqara olmaysiz" });
      await sql`UPDATE users SET fio = ${fio}, login = ${login}, role = ${role}, lavozim = ${str(f, "lavozim", 100)} WHERE id = ${id}`;
      if (pass) {
        const p = passwordProblem(pass);
        if (p) back("/xodimlar/", { xato: p });
        await sql`UPDATE users SET pass_hash = ${await hashPassword(pass)}, session_ver = session_ver + 1, fail_count = 0, blocked_until = NULL WHERE id = ${id}`;
      }
    } else {
      const p = passwordProblem(pass);
      if (p) back("/xodimlar/", { xato: p });
      await sql`INSERT INTO users (fio, login, pass_hash, role, lavozim) VALUES (${fio}, ${login}, ${await hashPassword(pass)}, ${role}, ${str(f, "lavozim", 100)})`;
    }
  } catch (e) {
    if (String(e).includes("users_login_key")) back("/xodimlar/", { xato: "Bu login band" });
    throw e;
  }
  await audit(u.id, id ? "xodim_tahrir" : "xodim_qoshish", `users:${id ?? login}`, { fio, login, role });
  revalidatePath("/xodimlar/");
  back("/xodimlar/", { ok: "Saqlandi" });
}

export async function toggleUser(f: FormData) {
  const u = await requireAdmin();
  const id = int(f, "id");
  if (id === u.id) back("/xodimlar/", { xato: "O'zingizni o'chira olmaysiz" });
  await db()`UPDATE users SET active = NOT active, session_ver = session_ver + 1 WHERE id = ${id}`;
  await audit(u.id, "xodim_holat", `users:${id}`);
  revalidatePath("/xodimlar/");
  back("/xodimlar/", { ok: "Holat o'zgartirildi" });
}

// ── Profil ─────────────────────────────────────────────────
export async function changePassword(f: FormData) {
  const u = await requireUser();
  const { verifyPassword } = await import("@/lib/password");
  const [row] = await db()`SELECT pass_hash FROM users WHERE id = ${u.id}`;
  if (!(await verifyPassword(String(f.get("eski") ?? ""), row.pass_hash))) back("/profil/", { xato: "Joriy parol noto'g'ri" });
  const pass = String(f.get("yangi") ?? "");
  const p = passwordProblem(pass);
  if (p) back("/profil/", { xato: p });
  await db()`UPDATE users SET pass_hash = ${await hashPassword(pass)}, session_ver = session_ver + 1 WHERE id = ${u.id}`;
  await audit(u.id, "parol", `users:${u.id}`);
  redirect("/login/?xato=" + encodeURIComponent("Parol o'zgardi. Yangi parol bilan kiring."));
}

export async function telegramCode() {
  const u = await requireUser();
  const code = String(randomInt(100000, 1000000));
  const sql = db();
  await sql`DELETE FROM tg_codes WHERE user_id = ${u.id} OR expires_at < now()`;
  await sql`INSERT INTO tg_codes (code, user_id, expires_at) VALUES (${code}, ${u.id}, now() + interval '15 minutes') ON CONFLICT (code) DO NOTHING`;
  back("/profil/", { ok: `Kod: ${code} — 15 daqiqa ichida botga yuboring` });
}

export async function unlinkTelegram() {
  const u = await requireUser();
  await db()`UPDATE users SET tg_chat_id = NULL WHERE id = ${u.id}`;
  await audit(u.id, "tg_uzish", `users:${u.id}`);
  back("/profil/", { ok: "Telegram uzildi" });
}

// ── Sozlamalar ─────────────────────────────────────────────
export async function saveSettings(f: FormData) {
  const u = await requireAdmin();
  const bhm = parseMoney(f.get("bhm"));
  const soat = Number(f.get("eslatma_soati"));
  if (!(bhm > 0)) back("/sozlamalar/", { xato: "BHM musbat son bo'lsin" });
  if (!(Number.isInteger(soat) && soat >= 0 && soat <= 23)) back("/sozlamalar/", { xato: "Eslatma soati 0–23 oralig'ida bo'lsin" });
  const rows = [
    { kalit: "firma_nomi", qiymat: str(f, "firma_nomi", 100) || "Aqilli Moliya" },
    { kalit: "bhm", qiymat: String(bhm) },
    { kalit: "eslatma_soati", qiymat: String(soat) },
  ];
  const sql = db();
  await sql`INSERT INTO settings ${sql(rows)} ON CONFLICT (kalit) DO UPDATE SET qiymat = EXCLUDED.qiymat`;
  await audit(u.id, "sozlamalar", "settings", rows);
  const { recomputeAll } = await import("@/lib/data");
  await recomputeAll();
  revalidatePath("/", "layout");
  back("/sozlamalar/", { ok: "Saqlandi, risklar qayta hisoblandi" });
}

export async function addTaxType(f: FormData) {
  const u = await requireAdmin();
  const nomi = str(f, "nomi", 100);
  const davr = str(f, "davr");
  const turi = str(f, "turi") === "statistika" ? "statistika" : "soliq";
  const kun = Number(f.get("kun"));
  const oy = Number(f.get("oy_offset"));
  if (!nomi || !["oy", "chorak", "yil"].includes(davr)) back("/sozlamalar/", { xato: "Nomi va davrni kiriting" });
  if (!(kun >= 1 && kun <= 31 && oy >= 0 && oy <= 12)) back("/sozlamalar/", { xato: "Kun 1–31, oy siljishi 0–12 bo'lsin" });
  const code = `${turi === "statistika" ? "st" : "sq"}_${Date.now().toString(36)}`;
  await db()`INSERT INTO tax_types (code, nomi, davr, oy_offset, kun, turi, izoh) VALUES (${code}, ${nomi}, ${davr}, ${oy}, ${kun}, ${turi}, ${str(f, "izoh", 500)})`;
  await audit(u.id, "soliq_turi_qoshildi", `tax_types:${code}`, { nomi, davr, turi });
  revalidatePath("/sozlamalar/");
  back("/sozlamalar/", { ok: `«${nomi}» qo'shildi. Endi uni korxona sahifasida belgilang` });
}

export async function saveTaxType(f: FormData) {
  const u = await requireAdmin();
  const code = str(f, "code", 40);
  const kun = Number(f.get("kun"));
  const oy = Number(f.get("oy_offset"));
  if (!(kun >= 1 && kun <= 31 && oy >= 0 && oy <= 12)) back("/sozlamalar/", { xato: "Kun 1–31, oy siljishi 0–12 bo'lsin" });
  await db()`UPDATE tax_types SET nomi = ${str(f, "nomi", 100)}, kun = ${kun}, oy_offset = ${oy} WHERE code = ${code}`;
  await audit(u.id, "soliq_turi", `tax_types:${code}`, { kun, oy });
  await generateDeadlines();
  revalidatePath("/muddatlar/");
  back("/sozlamalar/", { ok: "Muddat yangilandi, ochiq hisobotlar qayta hisoblandi" });
}

export async function saveCalendarDay(f: FormData) {
  const u = await requireAdmin();
  const sana = date(f, "sana");
  const tur = str(f, "tur");
  if (!sana) back("/sozlamalar/", { xato: "Sanani tanlang" });
  if (tur === "ochirish") await db()`DELETE FROM calendar_days WHERE sana = ${sana}`;
  else if (["bayram", "dam", "ish"].includes(tur))
    await db()`INSERT INTO calendar_days (sana, tur, nomi) VALUES (${sana}, ${tur}, ${str(f, "nomi", 100)}) ON CONFLICT (sana) DO UPDATE SET tur = EXCLUDED.tur, nomi = EXCLUDED.nomi`;
  else back("/sozlamalar/", { xato: "Turini tanlang" });
  await audit(u.id, "kalendar", `calendar:${sana}`, { tur });
  await generateDeadlines();
  back("/sozlamalar/#kalendar", { ok: "Kalendar yangilandi" });
}
