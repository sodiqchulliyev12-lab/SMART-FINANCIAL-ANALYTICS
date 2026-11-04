import { getLang, getT, getTheme } from "@/lib/i18n";
import { setLang, setTheme } from "@/lib/prefs";

/** Til (UZ/RU) va rang rejimi (kunduzgi / qorong'u / tizim) tugmalari */
export async function Prefs({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const [lang, theme, t] = await Promise.all([getLang(), getTheme(), getT()]);
  const seg = (on: boolean) => `px-2 py-1 text-xs font-medium ${on ? "bg-brand-600 text-white" : dark ? "text-side-muted hover:bg-white/10 hover:text-white" : "text-ink-700 hover:bg-ink-100"}`;
  const box = `flex overflow-hidden rounded-md border ${dark ? "border-white/15" : "border-ink-300"}`;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <form action={setLang} className={box} aria-label={t("Til")}>
        <button name="til" value="uz" className={seg(lang === "uz")} aria-pressed={lang === "uz"}>UZ</button>
        <button name="til" value="ru" className={seg(lang === "ru")} aria-pressed={lang === "ru"}>RU</button>
      </form>
      <form action={setTheme} className={box} aria-label={t("Rang rejimi")}>
        <button name="tema" value="light" className={seg(theme === "light")} aria-pressed={theme === "light"} title={t("Kunduzgi")}>☀</button>
        <button name="tema" value="dark" className={seg(theme === "dark")} aria-pressed={theme === "dark"} title={t("Qorong'u")}>☾</button>
        <button name="tema" value="system" className={seg(theme === "system")} aria-pressed={theme === "system"} title={t("Qurilmaga moslashsin")}>A</button>
      </form>
    </div>
  );
}
