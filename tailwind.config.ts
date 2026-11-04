import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef4ff", 100: "#dbe6fe", 400: "#5b8def", 500: "#3a6fe0", 600: "#2856c4", 700: "#1f449c", 900: "#14285a" },
        ink: { 900: "#151a23", 700: "#3a4250", 500: "#5c6573", 300: "#c9ced6", 100: "#eef0f3", 50: "#f6f7f9" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
