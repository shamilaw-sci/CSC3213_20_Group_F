/**
 * @file vite.config.js
 * @description Vite Build Configuration. Sets up Vite plugins for React, development server host binding, and optimized dependency pre-bundling.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'qrcode.react',
      'html5-qrcode',
      '@react-oauth/google',
      'react-hot-toast',
      'react-icons/fa',
      'react-easy-crop'
    ]
  }
})

