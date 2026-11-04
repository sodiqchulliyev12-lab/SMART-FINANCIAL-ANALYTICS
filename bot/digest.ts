// Kunlik xulosa: har bir ulangan xodimga o'z korxonalari bo'yicha (rahbariyatga — hammasi).
import { db } from "../lib/db";
import { LEVEL_LABEL, levelOf } from "../lib/risk";
import { addDays, iso, periodHuman } from "../lib/tax-calendar";
import { esc, tgSend } from "./notify";

const EMOJI = { past: "🟢", orta: "🟡", yuqori: "🟠", kritik: "🔴" } as const;

export async function digestFor(user: { id: number; role: string }, today: Date): Promise<string | null> {
  const sql = db();
  const scope = user.role === "admin" ? sql`` : sql`AND c.masul_id = ${user.id}`;
  const risky = await sql`
    SELECT c.id, c.nomi, s.ball, s.omillar->0->>'title' AS sabab, p.ball AS oldingi
    FROM companies c
    JOIN risk_snapshots s ON s.company_id = c.id AND s.sana = ${iso(today)}
    LEFT JOIN risk_snapshots p ON p.company_id = c.id AND p.sana = ${iso(addDays(today, -1))}
    WHERE NOT c.arxiv ${scope} AND s.ball >= 25
    ORDER BY s.ball DESC LIMIT 10`;
  const due = await sql`
    SELECT c.nomi, t.nomi AS soliq, d.davr, to_char(d.muddat,'DD.MM') AS m, d.muddat < ${iso(today)} AS late
    FROM deadlines d JOIN companies c ON c.id = d.company_id JOIN tax_types t ON t.code = d.soliq
    WHERE NOT c.arxiv ${scope} AND d.hisobot_holati = 'kutilmoqda' AND d.muddat <= ${iso(addDays(today, 3))}
    ORDER BY d.muddat LIMIT 15`;
  if (!risky.length && !due.length) return null;
  const lines = [`📊 <b>Kunlik xulosa · ${iso(today).split("-").reverse().join(".")}</b>`];
  if (risky.length) {
    lines.push("", "<b>Diqqat talab qiladigan korxonalar:</b>");
    for (const r of risky) {
      const lv = levelOf(r.ball);
      const jump = r.oldingi !== null && r.ball - r.oldingi >= 15 ? ` ⬆️ +${r.ball - r.oldingi}` : "";
      lines.push(`${EMOJI[lv]} ${esc(r.nomi)} — <b>${r.ball}</b> (${LEVEL_LABEL[lv]})${jump}${r.sabab ? `\n    ${esc(r.sabab)}` : ""}`);
    }
  }
  if (due.length) {
    lines.push("", "<b>Muddatlar (3 kun ichida va kechikkanlar):</b>");
    for (const d of due) lines.push(`${d.late ? "❗" : "•"} ${d.m} — ${esc(d.nomi)}: ${esc(d.soliq)} (${esc(periodHuman(d.davr))})`);
  }
  const site = process.env.SITE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "");
  if (site) lines.push("", `🌐 ${site}`);
  return lines.join("\n");
}

export async function sendDigests(today: Date): Promise<number> {
  const users = await db()`SELECT id, role, tg_chat_id::text AS chat FROM users WHERE active AND tg_chat_id IS NOT NULL`;
  let n = 0;
  for (const u of users) {
    const text = await digestFor(u as never, today);
    if (text && (await tgSend(u.chat, text))) n++;
  }
  return n;
}
