import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resendKey = env.VITE_RESEND_API_KEY || env.RESEND_API_KEY || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'import.meta.env.VITE_RESEND_API_KEY': JSON.stringify(resendKey),
    },
    server: {
      proxy: {
        '/api/resend': {
          target: 'https://api.resend.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/resend/, ''),
        },
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
})
