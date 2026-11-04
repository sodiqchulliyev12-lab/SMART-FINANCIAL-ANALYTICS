import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  serverExternalPackages: ["grammy", "postgres"],
  // Railway build keshi (.next/cache) eski webpack natijalarini qaytarib, kod o'zgargandan keyingi
  // birinchi build'ni "Module not found" bilan yiqitayotgan edi — production build keshsiz.
  // "@/..." taxallusi tsconfig'dan ba'zan o'qilmay qolyapti (Railway'da "Can't resolve '@/lib/...'"),
  // shuning uchun webpack'ga ham aniq beramiz.
  webpack(config, { dev }) {
    if (!dev) config.cache = false;
    config.resolve.alias = { ...(config.resolve.alias || {}), "@": root };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
