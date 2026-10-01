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
        surface: "#F8F9FA",
        "surface-container-low": "#F0F4F8",
        "surface-container-high": "#E1E8ED",
        "surface-container-highest": "#D3DDE6",
        "on-surface": "#191C1E",
        "on-surface-variant": "#41474D",
        primary: "#00639B",
        "on-primary": "#FFFFFF",
        "primary-container": "#C2E7FF",
        "on-primary-container": "#001D32",
      },
    },
  },
  plugins: [],
};

export default config;
