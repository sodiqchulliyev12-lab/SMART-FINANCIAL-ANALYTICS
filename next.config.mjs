/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  serverExternalPackages: ["grammy", "postgres"],
  // Railway build keshi (.next/cache) eski webpack natijalarini qaytarib, kod o'zgargandan keyingi
  // birinchi build'ni "Module not found" bilan yiqitayotgan edi — production build keshsiz.
  webpack(config, { dev }) {
    if (!dev) config.cache = false;
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
