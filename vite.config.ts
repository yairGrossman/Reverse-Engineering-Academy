import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static SPA — no server code, no dev endpoints. Progress lives in the
// visitor's localStorage and moves between devices via export/import.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
