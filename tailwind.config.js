module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3498db',
          dark: '#2980b9',
          light: '#5dade2',
        },
        secondary: {
          DEFAULT: '#2c3e50',
          dark: '#1a252f',
          light: '#34495e',
        },
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c',
        background: {
          dark: '#121212',
          DEFAULT: '#f5f5f5',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}; 