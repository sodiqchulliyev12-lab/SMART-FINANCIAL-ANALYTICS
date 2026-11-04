"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Chap menyu (to'q fon) */
export function Nav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
      {items.map((i) => {
        const active = isActive(i.href, path);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-white/10 font-medium text-white shadow-sm ring-1 ring-inset ring-white/10" : "text-side-muted hover:bg-white/5 hover:text-side-ink"}`}>
            <span aria-hidden className="w-5 text-center">{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tepa qatordagi joriy bo'lim nomi */
export function Crumb({ items, home }: { items: NavItem[]; home: string }) {
  const path = usePathname();
  const cur = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => isActive(i.href, path));
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="hidden text-side-muted sm:inline">{home}</span>
      <span className="hidden text-side-muted sm:inline" aria-hidden>/</span>
      <span className="truncate font-semibold text-side-ink">{cur?.label ?? home}</span>
    </div>
  );
}
