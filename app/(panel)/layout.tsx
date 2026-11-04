import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, logout } from "@/lib/auth";
import { setting } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Prefs } from "@/components/Prefs";
import { Nav, type NavItem } from "./nav";

const NAV: (NavItem & { admin?: boolean })[] = [
  { href: "/", label: "Risk paneli", icon: "◆" },
  { href: "/korxonalar/", label: "Korxonalar", icon: "🏢" },
  { href: "/muddatlar/", label: "Hisobot muddatlari", icon: "🗓" },
  { href: "/xatlar/", label: "Soliq xatlari", icon: "✉" },
  { href: "/ehf/", label: "EHF", icon: "🧾" },
  { href: "/ijara/", label: "Ijara", icon: "🏠" },
  { href: "/bojxona/", label: "Bojxona", icon: "🛃" },
  { href: "/ishchilar/", label: "Ishchilar", icon: "👷" },
  { href: "/xodimlar/", label: "Xodimlar", icon: "👥", admin: true },
  { href: "/sozlamalar/", label: "Sozlamalar", icon: "⚙", admin: true },
  { href: "/jurnal/", label: "Jurnal", icon: "📜", admin: true },
  { href: "/profil/", label: "Profil", icon: "👤" },
];

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
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-ink-100 bg-surface print:hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">◆</span>
            <span className="truncate">{firma}</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-ink-500 md:mt-2">
            <span>{user.fio} · {user.role === "admin" ? t("Rahbariyat") : user.lavozim || t("Xodim")}</span>
            <form action={doLogout} className="md:hidden"><button className="btn-ghost px-2 py-1 text-xs">{t("Chiqish")}</button></form>
          </div>
        </div>
        <div className="md:flex-1 md:overflow-y-auto"><Nav items={items} /></div>
        <Prefs className="px-5 pb-3 md:px-4 md:pt-3" />
        <form action={doLogout} className="hidden px-3 pb-4 md:block">
          <button className="btn-ghost w-full">↩ {t("Chiqish")}</button>
        </form>
      </aside>
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
