import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hfblue: '#325AB4',
      },
      fontFamily: {
        "function-pro": ['var(--font-function-pro)', 'sans-serif'],
        "noto-sans-jp": ['var(--font-noto-sans-jp)', 'sans-serif'],
        sans: ['var(--font-function-pro)', 'var(--font-noto-sans-jp)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
