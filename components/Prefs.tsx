import { getLang, getT, getTheme } from "@/lib/i18n";
import { setLang, setTheme } from "@/lib/prefs";

/** Til (UZ/RU) va rang rejimi (kunduzgi / qorong'u / tizim) tugmalari */
export async function Prefs({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const [lang, theme, t] = await Promise.all([getLang(), getTheme(), getT()]);
  const seg = (on: boolean) => `px-2 py-1 text-xs font-medium ${on ? "bg-brand-600 text-white" : dark ? "text-side-muted hover:bg-white/10 hover:text-white" : "text-ink-700 hover:bg-ink-100"}`;
  const box = `flex overflow-hidden rounded-md border ${dark ? "border-white/15" : "border-ink-300"}`;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <details className="relative">
        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md bg-amber-400 text-xs font-bold text-ink-900 hover:bg-amber-300 [&::-webkit-details-marker]:hidden" aria-label={t("Til")}>{lang.toUpperCase()}</summary>
        <form action={setLang} className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-xl border border-ink-100 bg-surface p-1 text-ink-900 shadow-xl">
          {([["ru", "Русский"], ["uz", "O'zbek tili"]] as const).map(([code, name]) => (
            <button key={code} name="til" value={code} aria-pressed={lang === code}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-ink-50 ${lang === code ? "font-semibold" : ""}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-100 text-[11px] font-semibold text-brand-700">{code.toUpperCase()}</span>{name}
            </button>
          ))}
        </form>
      </details>
      <form action={setTheme} className={box} aria-label={t("Rang rejimi")}>
        <button name="tema" value="light" className={seg(theme === "light")} aria-pressed={theme === "light"} title={t("Kunduzgi")}>☀</button>
        <button name="tema" value="dark" className={seg(theme === "dark")} aria-pressed={theme === "dark"} title={t("Qorong'u")}>☾</button>
        <button name="tema" value="system" className={seg(theme === "system")} aria-pressed={theme === "system"} title={t("Qurilmaga moslashsin")}>A</button>
      </form>
    </div>
  );
}
