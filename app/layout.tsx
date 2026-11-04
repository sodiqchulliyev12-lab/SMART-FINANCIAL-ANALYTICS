import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aqilli Moliya — korxonalar moliyaviy holati va risklar",
  description: "Buxgalteriya firmasi uchun: soliq muddatlari, xatlar, EHF, moliyaviy tahlil va risklarni oldindan aniqlash",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2856c4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
