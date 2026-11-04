// Telegram'ga xabar yuborish (bot ishlamayotgan bo'lsa ham API orqali). Matn HTML — foydalanuvchi ma'lumoti escape qilinadi.
import { db } from "@/lib/db";

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function tgSend(chatId: string | number, html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html.slice(0, 4000), parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/** Korxona mas'uli va barcha rahbariyatning chat ID'lari */
export async function recipientsFor(companyId: number): Promise<string[]> {
  const rows = await db()`SELECT DISTINCT tg_chat_id::text AS chat FROM users
    WHERE active AND tg_chat_id IS NOT NULL AND (role = 'admin' OR id = (SELECT masul_id FROM companies WHERE id = ${companyId}))`;
  return rows.map((r) => r.chat);
}

export async function notifyNewLetters(items: { company_id: number; tur: string; raqam: string; javob_muddati: string | null }[]) {
  const names = new Map((await db()`SELECT id, nomi FROM companies WHERE id = ANY(${items.map((i) => i.company_id)})`).map((r) => [r.id, r.nomi]));
  for (const it of items) {
    const text = `✉️ <b>Yangi soliq xati</b>\n${esc(names.get(it.company_id))}\n${esc(it.tur)} №${esc(it.raqam)}${it.javob_muddati ? `\nJavob muddati: <b>${esc(it.javob_muddati)}</b>` : ""}`;
    for (const chat of await recipientsFor(it.company_id)) await tgSend(chat, text);
  }
}
