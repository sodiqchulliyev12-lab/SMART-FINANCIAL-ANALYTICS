// Telegram bot (grammY, long polling — bitta Railway nusxasida). Xodim Profil'dan olgan 6 xonali kod bilan ulanadi.
import { Bot } from "grammy";
import { db } from "@/lib/db";
import { todayTashkent } from "@/lib/tax-calendar";
import { digestFor } from "./digest";
import { esc } from "./notify";

async function userByChat(chatId: number) {
  const [u] = await db()`SELECT id, fio, role FROM users WHERE tg_chat_id = ${chatId} AND active`;
  return u as { id: number; fio: string; role: string } | undefined;
}

export async function startBot() {
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

  bot.command("start", async (ctx) => {
    const u = await userByChat(ctx.chat.id);
    await ctx.reply(u
      ? `Assalomu alaykum, ${u.fio}! Siz ulangansiz.\n\n/xulosa — bugungi risklar va muddatlar`
      : "Assalomu alaykum! Saytdagi Profil sahifasida «Kod olish»ni bosing va 6 xonali kodni shu yerga yuboring.");
  });

  bot.command(["xulosa", "risk"], async (ctx) => {
    const u = await userByChat(ctx.chat.id);
    if (!u) return ctx.reply("Avval saytdagi Profil'dan kod olib, ulaning.");
    const text = await digestFor(u, todayTashkent());
    await ctx.reply(text ?? "✅ Bugun diqqat talab qiladigan narsa yo'q.", { parse_mode: "HTML" });
  });

  bot.hears(/^\s*(\d{6})\s*$/, async (ctx) => {
    const code = ctx.match[1];
    const sql = db();
    const [row] = await sql`DELETE FROM tg_codes WHERE code = ${code} AND expires_at > now() RETURNING user_id`;
    if (!row) return ctx.reply("Kod noto'g'ri yoki eskirgan. Saytdan yangisini oling.");
    await sql`UPDATE users SET tg_chat_id = NULL WHERE tg_chat_id = ${ctx.chat.id}`;
    const [u] = await sql`UPDATE users SET tg_chat_id = ${ctx.chat.id} WHERE id = ${row.user_id} RETURNING fio`;
    await sql`INSERT INTO audit_log (user_id, amal, obyekt) VALUES (${row.user_id}, 'tg_ulash', 'users')`;
    await ctx.reply(`✅ Bog'landi, ${esc(u.fio)}. Endi har kuni xulosa va muhim ogohlantirishlar shu yerga keladi.\n/xulosa — hozirgi holat`);
  });

  bot.catch((e) => console.error("[bot] xato:", e.error));
  await bot.api.setMyCommands([
    { command: "xulosa", description: "Bugungi risklar va muddatlar" },
    { command: "start", description: "Boshlash" },
  ]);
  bot.start({ drop_pending_updates: true, onStart: (me) => console.log(`[bot] @${me.username} ishga tushdi`) });
}
