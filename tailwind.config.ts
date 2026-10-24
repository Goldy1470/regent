import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050509",
          900: "#0a0a12",
          800: "#10101a",
          700: "#161622",
          600: "#1d1d2c",
        },
        volt: {
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        mint: {
          400: "#34d399",
          500: "#10b981",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 8px 50px -12px rgba(124, 58, 237, 0.5)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 40px -14px rgba(0,0,0,0.6)",
        lift: "0 20px 60px -18px rgba(124, 58, 237, 0.35)",
      },
      typography: {},
    },
  },
  plugins: [],
};
export default config;
