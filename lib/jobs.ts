// Fon vazifalari: har kuni muddatlarni yaratish, risklarni qayta hisoblash va Telegram xulosasini yuborish.
// Railway'da bitta nusxa ishlaydi; ikki marta ishga tushmasligi uchun settings'da oxirgi bajarilgan sana saqlanadi.
import { db, setting } from "./db";
import { generateDeadlines, recomputeAll } from "./data";
import { iso, todayTashkent } from "./tax-calendar";
import { sendDigests } from "../bot/digest";

async function mark(kalit: string, qiymat: string) {
  await db()`INSERT INTO settings (kalit, qiymat) VALUES (${kalit}, ${qiymat}) ON CONFLICT (kalit) DO UPDATE SET qiymat = EXCLUDED.qiymat`;
}

/** Bugun hali bajarilmagan bo'lsa bajaradi. Takroriy chaqirish xavfsiz. */
export async function tick(now = new Date()) {
  const today = iso(todayTashkent(now));
  if ((await setting("jobs_last_day")) !== today) {
    const n = await generateDeadlines(todayTashkent(now));
    const c = await recomputeAll(todayTashkent(now));
    await db()`DELETE FROM tg_codes WHERE expires_at < now()`;
    await mark("jobs_last_day", today);
    console.log(`[jobs] ${today}: ${n} ta yangi muddat, ${c} ta korxona riski yangilandi`);
  }
  const hour = new Date(now.getTime() + 5 * 3600000).getUTCHours();
  const at = Number(await setting("eslatma_soati", "9"));
  if (hour >= at && (await setting("digest_last_day")) !== today) {
    await mark("digest_last_day", today);
    const sent = await sendDigests(todayTashkent(now));
    console.log(`[jobs] kunlik xulosa ${sent} ta xodimga yuborildi`);
  }
}

let started = false;
export function startScheduler() {
  if (started) return;
  started = true;
  const run = () => tick().catch((e) => console.error("[jobs] xato:", e));
  setTimeout(run, 5_000);
  setInterval(run, 10 * 60_000);
}
