import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        border: "var(--border)",
        "border-2": "var(--border-2)",
        amber: "var(--amber)",
        "amber-dim": "var(--amber-dim)",
        text: "var(--text)",
        "text-dim": "var(--text-dim)",
        "text-muted": "var(--text-muted)",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "monospace"],
        serif: ["Instrument Serif", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
