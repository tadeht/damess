/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Barlow'", "sans-serif"],
        body: ["'Barlow'", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: "hsl(var(--card) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground) / <alpha-value>)",
        border: "hsl(220 6% 30% / <alpha-value>)",
        muted: "hsl(220 8% 70% / <alpha-value>)",
        surface: "hsl(220 6% 21% / 0.85)",
        canvas: "#1e1f22",
        primary: "#5865f2",
        success: "#23a55a",
        warning: "#f0b232",
        danger: "#f23f43",
        accent: "#5865f2",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
};
