// Server ishga tushganda: migratsiyalar → fon vazifalari → Telegram bot (hammasi bitta Railway servisida).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[app] DATABASE_URL yo'q — baza ulanmagan");
    return;
  }
  const { migrate } = await import("./lib/migrate");
  await migrate();
  if (process.env.JOBS_DISABLED !== "1") (await import("./lib/jobs")).startScheduler();
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.BOT_DISABLED !== "1") {
    const { startBot } = await import("./bot/bot");
    await startBot().catch((e) => console.error("[bot] ishga tushmadi:", e));
  }
}
