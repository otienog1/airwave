import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      fontSize: {
        'label-xs': ['11px', { lineHeight: '1.45', fontWeight: '500', letterSpacing: '0.04em' }],
        'label-sm': ['12px', { lineHeight: '1.4',  fontWeight: '500' }],
        'body-sm':  ['13px', { lineHeight: '1.5',  fontWeight: '400' }],
        'body':     ['15px', { lineHeight: '1.6',  fontWeight: '400' }],
        'title-sm': ['15px', { lineHeight: '1.4',  fontWeight: '600' }],
        'title':    ['17px', { lineHeight: '1.3',  fontWeight: '600' }],
        'headline': ['22px', { lineHeight: '1.2',  fontWeight: '700', letterSpacing: '-0.015em' }],
        'display':  ['28px', { lineHeight: '1.1',  fontWeight: '800', letterSpacing: '-0.02em' }],
      },
    },
  },
  plugins: [],
};

export default config;
