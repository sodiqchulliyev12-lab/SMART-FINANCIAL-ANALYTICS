// Ikki til: o'zbekcha (asosiy) va ruscha. Kalit — o'zbekcha matnning o'zi; tarjimasi yo'q bo'lsa o'zbekcha ko'rinadi.
// Til «til» cookie'sida saqlanadi (Sozlamalar paneli yoki yon menyudagi UZ/RU tugmasi).
import { cache } from "react";
import { cookies } from "next/headers";
import { RU } from "./i18n-ru";

export type Lang = "uz" | "ru";
export type Theme = "light" | "dark" | "system";
export type T = ((s: string, vars?: Record<string, string | number>) => string) & { lang: Lang };

export function translator(lang: Lang): T {
  const f = (s: string, vars?: Record<string, string | number>) => {
    let r = lang === "ru" ? RU[s] ?? s : s;
    if (vars) for (const [k, v] of Object.entries(vars)) r = r.split(`{${k}}`).join(String(v));
    return r;
  };
  return Object.assign(f, { lang });
}

export const getLang = cache(async (): Promise<Lang> => ((await cookies()).get("til")?.value === "ru" ? "ru" : "uz"));
export const getTheme = cache(async (): Promise<Theme> => {
  const v = (await cookies()).get("tema")?.value;
  return v === "light" || v === "dark" ? v : "system";
});
export async function getT(): Promise<T> {
  return translator(await getLang());
}
