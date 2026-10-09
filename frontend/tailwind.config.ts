import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#F5F7FC",
        primary: "#0F172A",
        secondary: "#475569",
        muted: "#64748B",
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        semantic: {
          normal: "#10B981",
          attack: "#F43F5E",
          warning: "#F59E0B",
        },
        attackClass: {
          Normal: "#10B981",
          Generic: "#6366F1",
          Exploits: "#F43F5E",
          Fuzzers: "#F59E0B",
          DoS: "#8B5CF6",
          Reconnaissance: "#0EA5E9",
          Analysis: "#14B8A6",
          Backdoor: "#EC4899",
          Shellcode: "#64748B",
          Worms: "#65A30D",
        },
      },
      borderRadius: {
        glass: "22px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(76, 94, 150, 0.10)",
        "glass-inset": "inset 0 1px 0 rgba(255, 255, 255, 0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
