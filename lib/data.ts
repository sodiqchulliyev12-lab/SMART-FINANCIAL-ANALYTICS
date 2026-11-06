// Bazadan o'qish/yozish va risk hisoblash (sahifalar, bot va fon vazifalari shu yerdan foydalanadi).
import { db, setting } from "./db";
import type { Financials } from "./finance";
import { assessRisk, type RiskInput, type RiskResult } from "./risk";
import { addDays, deadlinesBetween, iso, todayTashkent, type Calendar, type TaxType } from "./tax-calendar";

export type CompanyRow = {
  id: number;
  nomi: string;
  stir: string;
  rejim: string;
  faoliyat: string;
  direktor: string;
  telefon: string;
  bank: string;
  hisob_raqam: string;
  masul_id: number | null;
  masul: string | null;
  izoh: string;
  arxiv: boolean;
  ball: number | null;
  daraja: string | null;
};

export async function listCompanies(scopeUserId: number | null, opts: { arxiv?: boolean; q?: string } = {}): Promise<CompanyRow[]> {
  const sql = db();
  const q = opts.q?.trim() ? `%${opts.q.trim()}%` : null;
  return sql<CompanyRow[]>`
    SELECT c.*, u.fio AS masul, r.ball, r.daraja
    FROM companies c
    LEFT JOIN users u ON u.id = c.masul_id
    LEFT JOIN LATERAL (SELECT ball, daraja FROM risk_snapshots s WHERE s.company_id = c.id ORDER BY sana DESC LIMIT 1) r ON TRUE
    WHERE c.arxiv = ${opts.arxiv ?? false}
      ${scopeUserId ? sql`AND c.masul_id = ${scopeUserId}` : sql``}
      ${q ? sql`AND (c.nomi ILIKE ${q} OR c.stir ILIKE ${q})` : sql``}
    ORDER BY r.ball DESC NULLS LAST, c.nomi`;
}

export async function getCompany(id: number): Promise<CompanyRow | null> {
  const [c] = await db()<CompanyRow[]>`
    SELECT c.*, u.fio AS masul, NULL::int AS ball, NULL::text AS daraja
    FROM companies c LEFT JOIN users u ON u.id = c.masul_id WHERE c.id = ${id}`;
  return c ?? null;
}

export async function loadCalendar(): Promise<Calendar> {
  const rows = await db()`SELECT to_char(sana, 'YYYY-MM-DD') AS sana, tur FROM calendar_days`;
  return {
    holidays: new Set(rows.filter((r) => r.tur !== "ish").map((r) => r.sana)),
    workdays: new Set(rows.filter((r) => r.tur === "ish").map((r) => r.sana)),
  };
}

export async function taxTypes(): Promise<TaxType[]> {
  return db()<TaxType[]>`SELECT code, nomi, davr, oy_offset, kun, turi, izoh FROM tax_types ORDER BY turi, nomi`;
}

/** Har bir faol korxona × belgilangan soliq uchun muddati [bugun−120, bugun+60] oralig'idagi yozuvlarni yaratadi */
export async function generateDeadlines(today = todayTashkent(), companyId?: number): Promise<number> {
  const sql = db();
  const cal = await loadCalendar();
  const types = new Map((await taxTypes()).map((t) => [t.code, t]));
  const links = await sql`
    SELECT ct.company_id, ct.soliq, c.created_at FROM company_taxes ct JOIN companies c ON c.id = ct.company_id
    WHERE NOT c.arxiv ${companyId ? sql`AND c.id = ${companyId}` : sql``}`;
  const from = addDays(today, -120);
  const to = addDays(today, 60);
  const rows: { company_id: number; soliq: string; davr: string; muddat: string; tolov_holati: string }[] = [];
  for (const l of links) {
    const t = types.get(l.soliq);
    if (!t) continue;
    for (const d of deadlinesBetween(t, from, to, cal)) rows.push({ company_id: l.company_id, soliq: l.soliq, ...d, tolov_holati: t.turi === "statistika" ? "yoq" : "kutilmoqda" });
  }
  if (!rows.length) return 0;
  let created = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const res = await sql`INSERT INTO deadlines ${sql(chunk, "company_id", "soliq", "davr", "muddat", "tolov_holati")}
      ON CONFLICT (company_id, soliq, davr) DO UPDATE SET muddat = EXCLUDED.muddat
        WHERE deadlines.hisobot_holati = 'kutilmoqda' AND deadlines.muddat <> EXCLUDED.muddat
      RETURNING (xmax = 0) AS inserted`;
    created += res.filter((r) => r.inserted).length;
  }
  return created;
}

export async function financialsOf(companyId: number): Promise<Financials[]> {
  return db()<Financials[]>`SELECT * FROM financials WHERE company_id = ${companyId} ORDER BY davr`;
}

export async function riskInput(companyId: number, today = todayTashkent()): Promise<RiskInput | null> {
  const sql = db();
  const c = await getCompany(companyId);
  if (!c) return null;
  const [deadlines, letters, ehf, leases, financials, bhm, debt, contracts, wf, ai] = await Promise.all([
    sql`SELECT t.nomi AS soliq, t.turi, d.davr, to_char(d.muddat,'YYYY-MM-DD') AS muddat, d.hisobot_holati, d.tolov_holati
        FROM deadlines d JOIN tax_types t ON t.code = d.soliq
        WHERE d.company_id = ${companyId} AND d.muddat <= ${iso(addDays(today, 3))}
          AND (d.hisobot_holati = 'kutilmoqda' OR d.tolov_holati = 'kutilmoqda')`,
    sql`SELECT raqam, tur, to_char(javob_muddati,'YYYY-MM-DD') AS javob_muddati, holati FROM letters WHERE company_id = ${companyId} AND holati = 'yangi'`,
    sql`SELECT raqam, kontragent, to_char(sana,'YYYY-MM-DD') AS sana, holati, yonalish, xavfli, summa FROM ehf WHERE company_id = ${companyId} AND holati <> 'imzolandi'`,
    sql`SELECT raqam, to_char(tugash,'YYYY-MM-DD') AS tugash, holati FROM leases WHERE company_id = ${companyId} AND holati = 'faol'`,
    financialsOf(companyId),
    setting("bhm", "412000"),
    sql`SELECT summa FROM customs_debts WHERE company_id = ${companyId}`,
    sql`SELECT raqam, turi, kontragent, valyuta, summa, tolangan, yetkazilgan, to_char(sana,'YYYY-MM-DD') AS sana,
               to_char(ochiq_sana,'YYYY-MM-DD') AS ochiq_sana, to_char(tugash,'YYYY-MM-DD') AS tugash, holati
        FROM customs_contracts WHERE company_id = ${companyId} AND holati = 'faol'`,
    sql`SELECT count(*)::int AS n,
               count(*) FILTER (WHERE ketgan IS NULL)::int AS active,
               count(*) FILTER (WHERE kirgan > ${iso(addDays(today, -90))})::int AS hired90,
               count(*) FILTER (WHERE ketgan > ${iso(addDays(today, -90))})::int AS left90
        FROM workers WHERE company_id = ${companyId}`,
    sql`SELECT qarz, kamchiliklar, avtokameral, ehf_xavfli FROM ai_soliq WHERE company_id = ${companyId}`,
  ]);
  return {
    today,
    regime: c.rejim,
    bhm: Number(bhm) || 0,
    deadlines: deadlines as never,
    letters: letters as never,
    ehf: ehf as never,
    leases: leases as never,
    customsDebt: Number(debt[0]?.summa ?? 0),
    contracts: contracts as never,
    aiSoliq: ai[0] ? { qarz: Number(ai[0].qarz), kamchiliklar: ai[0].kamchiliklar, avtokameral: ai[0].avtokameral, ehfXavfli: ai[0].ehf_xavfli } : null,
    workforce: wf[0]?.n ? { active: wf[0].active, hired90: wf[0].hired90, left90: wf[0].left90 } : null,
    financials,
  };
}

export async function recomputeRisk(companyId: number, today = todayTashkent()): Promise<RiskResult | null> {
  const input = await riskInput(companyId, today);
  if (!input) return null;
  const r = assessRisk(input);
  const sql = db();
  await sql`INSERT INTO risk_snapshots (company_id, sana, ball, daraja, omillar)
    VALUES (${companyId}, ${iso(today)}, ${r.score}, ${r.level}, ${sql.json(r.factors as never)})
    ON CONFLICT (company_id, sana) DO UPDATE SET ball = EXCLUDED.ball, daraja = EXCLUDED.daraja, omillar = EXCLUDED.omillar`;
  return r;
}

export async function recomputeAll(today = todayTashkent()): Promise<number> {
  const ids = await db()`SELECT id FROM companies WHERE NOT arxiv`;
  for (const { id } of ids) await recomputeRisk(id, today);
  return ids.length;
}

export type RiskHistoryPoint = { sana: string; ball: number };
export async function riskHistory(companyId: number, days = 90): Promise<RiskHistoryPoint[]> {
  return db()<RiskHistoryPoint[]>`SELECT to_char(sana,'YYYY-MM-DD') AS sana, ball FROM risk_snapshots
    WHERE company_id = ${companyId} AND sana >= current_date - ${days}::int ORDER BY sana`;
}
