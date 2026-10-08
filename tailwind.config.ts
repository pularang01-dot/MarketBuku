import type { Config } from "tailwindcss";

// Tokens from the Stitch design system ("Biru Tinta + Kuning Emas"). Names kept so existing components inherit the new look.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F8FB",
        surface: { DEFAULT: "#FFFFFF", muted: "#EEF2F7" },
        line: "#DFE5EC",
        ink: { DEFAULT: "#14233A", soft: "#4B5B70", mute: "#75849A" },
        brand: { DEFAULT: "#1F3A5F", dark: "#14284A", deeper: "#0E1D36", light: "#E8EEF6" },
        marigold: { DEFAULT: "#F2A900", dark: "#8A5F00", light: "#FFF3D1" },
        leaf: { DEFAULT: "#0F766E", light: "#DDF3F0" },
        danger: { DEFAULT: "#B42318", light: "#FDECEA" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: { card: "12px", ctl: "10px", pill: "9999px" },
      boxShadow: {
        float: "0 4px 16px -2px rgba(20,35,58,.08), 0 1px 3px rgba(20,35,58,.04)",
        card: "none",
        lift: "0 4px 16px -2px rgba(20,35,58,.08), 0 1px 3px rgba(20,35,58,.04)",
      },
      maxWidth: { page: "1152px" },
    },
  },
  plugins: [],
};
export default config;