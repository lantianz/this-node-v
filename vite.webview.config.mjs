import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  },
  build: {
    emptyOutDir: true,
    outDir: resolve(process.cwd(), 'webview-dist'),
    cssCodeSplit: false,
    lib: {
      entry: resolve(process.cwd(), 'webview/src/main.ts'),
      fileName: () => 'sidebar.js',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'sidebar.css';
          }

          return 'assets/[name][extname]';
        }
      }
    }
  }
});
