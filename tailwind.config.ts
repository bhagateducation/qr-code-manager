import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#17161D',
        muted: '#666371',
        page: '#F5F4F7',
        surface: '#FEFDFE',
        line: '#E4E1E8',
        brand: {
          DEFAULT: '#5B43D6',
          soft: '#EEEAFE',
          hover: '#4D36BD',
        },
        success: '#16794B',
        warning: '#9A6108',
        danger: '#B43B47',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(91, 67, 214, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        'soft-hover': '0 20px 45px -12px rgba(91, 67, 214, 0.18), 0 8px 10px -4px rgba(0, 0, 0, 0.03)',
        glass: '0 20px 50px -15px rgba(23, 22, 29, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
