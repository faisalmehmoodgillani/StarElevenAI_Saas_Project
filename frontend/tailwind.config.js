/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#84CC16", // Electric Lime
          glow: "#A3E635",    // Lime Glow
          dark: "#65A30D",    // Deep Lime Hover
          muted: "rgba(132, 204, 22, 0.12)",
        },
        surface: {
          bg: "#09090B",      // Obsidian Slate (Primary Background)
          card: "#18181B",    // Dark Zinc (Cards & Sidebar)
          elevated: "#202024",// Hover / Elevated Panels
          border: "#27272A",  // Muted Zinc (Borders & Dividers)
        },
        status: {
          active: "#84CC16",     // Active Agent
          processing: "#F59E0B", // Amber Gold (Tool Executing)
          error: "#F43F5E",      // Rose Red (Error / Disconnected)
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "lime-glow": "0 0 20px rgba(132, 204, 22, 0.25)",
        "lime-sm": "0 0 10px rgba(163, 230, 53, 0.2)",
        "amber-glow": "0 0 14px rgba(245, 158, 11, 0.22)",
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};