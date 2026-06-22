module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f6f7fb',
          100: '#eef0f6',
          200: '#dbe0ef',
          300: '#aebfe0',
          400: '#7a8ed1',
          500: '#4a5ec2',
          600: '#3949a3',
          700: '#2a377f',
          800: '#1f2a63',
          900: '#142043'
        },
        accent: {
          50: '#fff8f3',
          100: '#fff2ea',
          200: '#ffe0c9',
          300: '#ffb88a',
          400: '#ff8b4d',
          500: '#ff5f14',
          600: '#e64f10',
          700: '#b63b0c',
          800: '#8a2e09',
          900: '#641e06'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        serif: ['Merriweather', 'serif']
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        md: '10px',
        lg: '16px',
        full: '9999px'
      }
    }
  },
  plugins: []
}
