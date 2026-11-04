import type { Config } from "tailwindcss";

// Ranglar CSS o'zgaruvchilarida (app/globals.css): kunduzgi va qorong'u rejim bitta klass nomlari bilan ishlaydi.
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        series: { 1: "rgb(var(--c-s1) / <alpha-value>)", 2: "rgb(var(--c-s2) / <alpha-value>)", 3: "rgb(var(--c-s3) / <alpha-value>)" },
        ink: { 50: "rgb(var(--c-ink-50) / <alpha-value>)", 100: "rgb(var(--c-ink-100) / <alpha-value>)", 300: "rgb(var(--c-ink-300) / <alpha-value>)", 500: "rgb(var(--c-ink-500) / <alpha-value>)", 700: "rgb(var(--c-ink-700) / <alpha-value>)", 900: "rgb(var(--c-ink-900) / <alpha-value>)" },
        brand: { 50: "rgb(var(--c-brand-50) / <alpha-value>)", 100: "rgb(var(--c-brand-100) / <alpha-value>)", 400: "rgb(var(--c-brand-400) / <alpha-value>)", 500: "rgb(var(--c-brand-500) / <alpha-value>)", 600: "rgb(var(--c-brand-600) / <alpha-value>)", 700: "rgb(var(--c-brand-700) / <alpha-value>)", 900: "rgb(var(--c-brand-900) / <alpha-value>)" },
        emerald: { 50: "rgb(var(--c-emerald-50) / <alpha-value>)", 200: "rgb(var(--c-emerald-200) / <alpha-value>)", 500: "rgb(var(--c-emerald-500) / <alpha-value>)", 600: "rgb(var(--c-emerald-600) / <alpha-value>)", 700: "rgb(var(--c-emerald-700) / <alpha-value>)", 800: "rgb(var(--c-emerald-800) / <alpha-value>)" },
        amber: { 50: "rgb(var(--c-amber-50) / <alpha-value>)", 200: "rgb(var(--c-amber-200) / <alpha-value>)", 500: "rgb(var(--c-amber-500) / <alpha-value>)", 600: "rgb(var(--c-amber-600) / <alpha-value>)", 700: "rgb(var(--c-amber-700) / <alpha-value>)", 800: "rgb(var(--c-amber-800) / <alpha-value>)" },
        orange: { 50: "rgb(var(--c-orange-50) / <alpha-value>)", 200: "rgb(var(--c-orange-200) / <alpha-value>)", 500: "rgb(var(--c-orange-500) / <alpha-value>)", 600: "rgb(var(--c-orange-600) / <alpha-value>)", 700: "rgb(var(--c-orange-700) / <alpha-value>)", 800: "rgb(var(--c-orange-800) / <alpha-value>)" },
        red: { 50: "rgb(var(--c-red-50) / <alpha-value>)", 200: "rgb(var(--c-red-200) / <alpha-value>)", 500: "rgb(var(--c-red-500) / <alpha-value>)", 600: "rgb(var(--c-red-600) / <alpha-value>)", 700: "rgb(var(--c-red-700) / <alpha-value>)", 800: "rgb(var(--c-red-800) / <alpha-value>)" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
