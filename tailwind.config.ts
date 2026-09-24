import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        quantum: {
          50: "#eefbfb",
          100: "#d5f5f5",
          200: "#b0eaeb",
          300: "#7bd8da",
          400: "#3ebdC2",
          500: "#14a1a7",
          600: "#168288",
          700: "#18686d",
          800: "#1a5357",
          900: "#1a4649",
          950: "#09292c",
        },
        clinical: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(20, 161, 167, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(20, 161, 167, 0.7)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
