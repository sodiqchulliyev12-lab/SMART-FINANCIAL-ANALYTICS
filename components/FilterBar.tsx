import type { ReactNode } from "react";
import { getT } from "@/lib/i18n";

/** Ixcham filtr: qidiruv qatori va "Filtr" tugmasi; qo'shimcha maydonlar tugma bosilganda ochiladi */
export async function FilterBar({ search = true, q, placeholder = "Korxona nomi yoki STIR bo'yicha qidirish", hidden = {}, active = 0, clearHref, children }: {
  search?: boolean; q?: string; placeholder?: string; hidden?: Record<string, string | number | null | undefined>; active?: number; clearHref?: string; children?: ReactNode;
}) {
  const t = await getT();
  return (
    <form className={search ? "mb-4 flex items-start gap-2" : "flex items-start justify-end"} aria-label={t("Filtr")}>
      {Object.entries(hidden).map(([k, v]) => (v === null || v === undefined || v === "" ? null : <input key={k} type="hidden" name={k} value={v} />))}
      {search && <div className="relative min-w-0 flex-1">
        <input name="q" defaultValue={q ?? ""} placeholder={t(placeholder)} className="input h-10 border-transparent bg-surface pr-10 shadow-sm" aria-label={t(placeholder)} />
        <button className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-500 hover:text-ink-900" aria-label={t("Qidirish")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>
      </div>}
      {children && (
        <details className="relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-ink-300 bg-surface px-4 text-sm font-medium text-ink-900 shadow-sm hover:bg-ink-50 [&::-webkit-details-marker]:hidden">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" /></svg>
            {t("Filtr")}
            {active > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] leading-5 text-white">{active}</span>}
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-ink-100 bg-surface p-4 shadow-xl">
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
}
