import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14110F",
        surface: "#1D1913",
        gold: "#C9A227",
        olive: "#7A9A54",
        rust: "#B85C38",
        ivory: "#F1EAD9",
      },
    },
  },
  plugins: [],
};
export default config;
