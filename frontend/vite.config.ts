import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      hmr: env.DISABLE_HMR !== 'true',
      watch: env.DISABLE_HMR === 'true' ? null : {},
      port: parseInt(env.VITE_PORT || '5173', 10),
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['lucide-react', 'motion'],
          },
        },
      },
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'terser' : false,
      chunkSizeWarningLimit: 1000,
    },
    assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot', '**/*.svg'],
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    define: {
      'import.meta.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL || 'ws://localhost:3000'),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3000'),
      'import.meta.env.VITE_ENV': JSON.stringify(env.VITE_ENV || mode),
    },
  };
});