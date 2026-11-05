import type { Config } from "tailwindcss";

// Design tokens carried over from the original City Quest prototype.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg1: "#ebe7f8",
        bg2: "#f7f5fc",
        backdrop: "#d9d4ea",
        ink: "#15131f",
        muted: "#6c6883",
        line: "#dcd7ec",
        body: "#3a3750",
        blue: { DEFAULT: "#2f5bff", soft: "#e3e9ff" },
        green: { DEFAULT: "#178a4c", soft: "#e1f4e8" },
        danger: { DEFAULT: "#c0362c", soft: "#fbe9e7" },
        amber: { DEFAULT: "#9a6200", soft: "#fdf1dc" },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Geist Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 6px 24px rgba(60,40,140,.07)",
        stop: "0 4px 16px rgba(60,40,140,.05)",
        phone: "0 20px 50px rgba(40,30,90,.18)",
        tabs: "0 8px 24px rgba(40,30,90,.12)",
      },
    },
  },
  plugins: [],
};

export default config;
