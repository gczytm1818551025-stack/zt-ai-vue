import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const { VITE_APP_BASE_API, VITE_APP_SERVER_URL } = env

  return {
    plugins: [vue()],
    base: '/',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    },
    server: {
      host: '0.0.0.0', // 部署在所有网卡接口ip上
      port: 5173,
      proxy: {
        [VITE_APP_BASE_API]: {
          target: VITE_APP_SERVER_URL || 'http://127.0.0.1:18081',
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${VITE_APP_BASE_API}`), ''),
          secure: false,
          ws: true
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          manualChunks: {
            vue: ['vue', 'vue-router', 'vuex'],
            elementPlus: ['element-plus', '@element-plus/icons-vue'],
            highlight: ['highlight.js'],
            markdown: ['marked']
          }
        }
      }
    }
  }
})
