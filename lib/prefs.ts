"use server";
// Foydalanuvchi sozlamalari: til va rang rejimi (cookie, 1 yil).
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

async function backTo(): Promise<never> {
  const ref = (await headers()).get("referer");
  let path = "/";
  try {
    if (ref) {
      const u = new URL(ref);
      path = u.pathname + u.search;
    }
  } catch {}
  redirect(path);
}

const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const, httpOnly: false };

export async function setLang(f: FormData) {
  (await cookies()).set("til", f.get("til") === "ru" ? "ru" : "uz", opts);
  await backTo();
}

export async function setTheme(f: FormData) {
  const v = String(f.get("tema"));
  (await cookies()).set("tema", v === "light" || v === "dark" ? v : "system", opts);
  await backTo();
}
