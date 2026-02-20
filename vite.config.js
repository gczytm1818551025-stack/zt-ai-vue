import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd())
  const { VITE_APP_BASE_API } = env

  return {
    plugins: [
      vue(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      host: '0.0.0.0', // 允许局域网访问
      port: 5173,      // 指定前端端口
      proxy: {
        // 使用环境变量中的代理前缀
        [VITE_APP_BASE_API]: {
          target: 'http://127.0.0.1:18081', 
          changeOrigin: true, // 允许跨域
          // 重写路径：去掉前缀
          rewrite: (path) => path.replace(new RegExp(`^${VITE_APP_BASE_API}`), ''), 
          secure: false,
          ws: true
        }
      }
    }
  }
})
