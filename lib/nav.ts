import type { NavItem } from "@/app/(panel)/nav";

// Chap menyu bo'limlari. Sarlavhasi shu ro'yxatda bo'lgan sahifa nomi tepa qatorda ko'rsatiladi.
export const NAV: (NavItem & { admin?: boolean })[] = [
  { href: "/", label: "Risk paneli", icon: "◆" },
  { href: "/tahlil/", label: "Moliyaviy tahlil", icon: "📊" },
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

export const NAV_LABELS = new Set(NAV.map((i) => i.label));
