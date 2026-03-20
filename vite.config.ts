import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Plugin para ignorar erros de Source Maps do MediaPipe
const ignoreSourceMaps = {
  name: 'ignore-sourcemaps',
  resolveId(id) {
    if (id.includes('vision_bundle_mjs.js.map')) {
      return id;
    }
    return null;
  },
  load(id) {
    if (id.includes('vision_bundle_mjs.js.map')) {
      return '{"version":3,"file":"vision_bundle.mjs","sources":[],"names":[],"mappings":""}';
    }
    return null;
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ignoreSourceMaps
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    sourcemap: false,
  }
})
