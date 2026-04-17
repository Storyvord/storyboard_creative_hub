/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pop-in": {
          "0%":   { opacity: "0", transform: "scale(0.88) translateY(8px)" },
          "70%":  { transform: "scale(1.03) translateY(-2px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "fade-in-up":     "fade-in-up 0.28s ease-out forwards",
        "scale-in":       "scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "slide-in-right": "slide-in-right 0.32s cubic-bezier(0.32,0.72,0,1) forwards",
        "pop-in":         "pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
      },
    },
  },
  plugins: [],
}
