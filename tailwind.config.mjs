/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Neutral backbone — warm near-black instrument greys.
        // (token name `lab` retained so existing markup keeps working)
        lab: {
          50:  '#f6f6f4',
          100: '#e9e8e3', // primary text — warm bone-white
          200: '#d2d1ca',
          300: '#b0afa6',
          400: '#88877e', // secondary text
          500: '#65645c', // muted text / labels
          600: '#4a4a44',
          700: '#33332e', // hairline rules on dark
          800: '#242420', // surface borders / raised edges
          900: '#181815', // panel surface
          950: '#0c0c0a', // page background — warm near-black
        },
        // Accent — matte bronze instrument readout. Used sparingly.
        // (token name `bio` retained; no longer neon cyan)
        bio: {
          50:  '#faf3e6',
          100: '#f2e3c6',
          200: '#e6cd97',
          300: '#d9b76b',
          400: '#c89b3f', // primary accent: links, active, key figures
          500: '#b3852f', // labels
          600: '#946a23', // button fill
          700: '#6f4f1b',
          800: '#4d3713',
          900: '#30230d',
          950: '#1c1408',
        },
        // Functional signal — caution / toxic / live. Distinct from accent.
        spore: {
          400: '#e0673a',
          500: '#cf4f23',
          600: '#b03e18',
        },
        // Semantic — edible / safe / nominal. Muted sage.
        mycel: {
          400: '#8aa06a',
          500: '#6f8a4f',
          600: '#566e3c',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      backgroundImage: {
        // Hairline engineering grid — flat, no glow.
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M32 0H0V32' fill='none' stroke='%2333332e' stroke-width='0.5'/%3E%3C/svg%3E")`,
      },
    },
  },
  plugins: [],
};
