import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1E3A5F",
          50: "#EBF0F7",
          100: "#C3D3E8",
          500: "#1E3A5F",
          600: "#172E4C",
          700: "#102039",
        },
      },
    },
  },
  plugins: [],
};
export default config;
