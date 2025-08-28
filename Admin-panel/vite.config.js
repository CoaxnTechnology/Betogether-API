import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  // 👇 this tells Vite that your app will be served from /admin-panel
  base: '/admin-panel/',
})
