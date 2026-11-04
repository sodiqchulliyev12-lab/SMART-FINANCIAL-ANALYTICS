import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang, getTheme } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Aqilli Moliya — korxonalar moliyaviy holati va risklar",
  description: "Buxgalteriya firmasi uchun: soliq muddatlari, xatlar, EHF, moliyaviy tahlil va risklarni oldindan aniqlash",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2856c4" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html lang={lang} className={theme === "system" ? undefined : theme}>
      <body>{children}</body>
    </html>
  );
}
