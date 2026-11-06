import type { ReactNode } from "react";
import { getT } from "@/lib/i18n";
import { HeaderSlot } from "./HeaderSlot";

/** Ixcham filtr: qidiruv qatori va "Filtr" tugmasi; qo'shimcha maydonlar tugma bosilganda ochiladi */
export async function FilterBar({ search = true, q, placeholder = "Korxona nomi yoki STIR bo'yicha qidirish", hidden = {}, active = 0, clearHref, children }: {
  search?: boolean; q?: string; placeholder?: string; hidden?: Record<string, string | number | null | undefined>; active?: number; clearHref?: string; children?: ReactNode;
}) {
  const t = await getT();
  const form = (dark: boolean) => (
    <form className={dark ? "flex w-full items-center gap-2" : search ? "mb-4 flex items-start gap-2" : "flex items-start justify-end"} aria-label={t("Filtr")}>
      {Object.entries(hidden).map(([k, v]) => (v === null || v === undefined || v === "" ? null : <input key={k} type="hidden" name={k} value={v} />))}
      {search ? <div className="relative min-w-0 flex-1">
        <input name="q" defaultValue={q ?? ""} placeholder={t(placeholder)} aria-label={t(placeholder)}
          className={dark ? "h-9 w-full rounded-lg border border-white/10 bg-white/10 pl-3 pr-10 text-sm text-white placeholder:text-side-muted focus:border-brand-500 focus:outline-none" : "input h-10 border-transparent bg-surface pr-10 shadow-sm"} />
        <button className={`absolute inset-y-0 right-0 flex w-10 items-center justify-center ${dark ? "text-side-muted hover:text-white" : "text-ink-500 hover:text-ink-900"}`} aria-label={t("Qidirish")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>
      </div> : dark && <div className="flex-1" />}
      {children && (
        <details className="relative">
          <summary className={`flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 text-sm font-medium [&::-webkit-details-marker]:hidden ${dark ? "h-9 border border-white/10 bg-white/10 text-white hover:bg-white/20" : "h-10 border border-ink-300 bg-surface text-ink-900 shadow-sm hover:bg-ink-50"}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" /></svg>
            {t("Filtr")}
            {active > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] leading-5 text-white">{active}</span>}
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-ink-100 bg-surface p-4 text-ink-900 shadow-xl">
            {children}
            <div className="flex items-center gap-2 pt-1">
              <button className="btn">{t("Ko'rsatish")}</button>
              {active > 0 && clearHref && <a href={clearHref} className="btn-ghost">{t("Tozalash")}</a>}
            </div>
          </div>
        </details>
      )}
    </form>
  );
  return <HeaderSlot inline={form(false)}>{form(true)}</HeaderSlot>;
}
