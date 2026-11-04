import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, logout } from "@/lib/auth";
import { setting } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Prefs } from "@/components/Prefs";
import { Crumb, Nav } from "./nav";
import { NAV } from "@/lib/nav";
import { dateUz } from "@/lib/format";
import { iso, todayTashkent } from "@/lib/tax-calendar";

async function doLogout() {
  "use server";
  await logout();
  redirect("/login/");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login/");
  const [firma, t] = await Promise.all([setting("firma_nomi", "Aqilli Moliya"), getT()]);
  const items = NAV.filter((i) => !i.admin || user.role === "admin").map(({ href, label, icon }) => ({ href, label: t(label), icon }));
  const initials = user.fio.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const role = user.role === "admin" ? t("Rahbariyat") : user.lavozim || t("Xodim");
  return (
    <div className="min-h-screen bg-side md:flex">
      <aside className="text-side-ink print:hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="flex h-14 items-center px-5">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow">◆</span>
            <span className="truncate">{firma}</span>
          </Link>
        </div>
        <div className="mx-5 mb-3 hidden h-px bg-white/10 md:block" />
        <div className="md:flex-1 md:overflow-y-auto"><Nav items={items} /></div>
        <div className="mx-3 mb-4 mt-3 hidden items-center gap-3 rounded-xl bg-white/5 p-3 md:flex">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initials}</span>
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium text-side-ink">{user.fio}</p>
            <p className="truncate text-side-muted">{role}</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 bg-side px-4 text-side-ink print:hidden md:px-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <Crumb items={items} />
            <span className="hidden shrink-0 text-xs text-side-muted sm:inline">{t("Bugun")} {dateUz(iso(todayTashkent()))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Prefs dark />
            <span className="hidden max-w-[10rem] truncate text-xs text-side-muted lg:inline">{user.fio}</span>
            <form action={doLogout}>
              <button className="rounded-md px-2 py-1 text-xs text-side-muted hover:bg-white/10 hover:text-white" title={t("Chiqish")}>↩<span className="ml-1 hidden sm:inline">{t("Chiqish")}</span></button>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 bg-ink-50 px-4 py-5 md:rounded-tl-2xl md:px-8 md:py-6 print:rounded-none">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
