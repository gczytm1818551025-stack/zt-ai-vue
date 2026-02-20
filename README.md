<p align="center">
	<img alt="logo" src="./src/assets/logo.png" width="180px" height="180px">
</p>
<h1 align="center" style="margin: 30px 0 30px; font-weight: bold;">智瞳AI助手</h1>
<h4 align="center">一个具有“思考-行动-观察”能力的多功能AI助手</h4>

## ✨ 功能

- **多轮对话**: 支持多轮对话，能够联系上下文进行交流。
- **思考过程**: 清晰展示AI的思考过程，包括反思和行动步骤。
- **历史会话**: 保存历史会e话记录，方便回顾和继续对话。
- **主题切换**: 支持亮色和暗色主题切换。

## 🚀 技术栈

- **前端框架**: Vue.js 3
- **构建工具**: Vite
- **UI 框架**: Element Plus
- **路由**: Vue Router
- **状态管理**: Vuex
- **HTTP 请求**: Axios
- **Markdown 解析**: Marked
- **代码高亮**: Highlight.js

## 📦 项目设置

1. **克隆项目**

   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   ```

2. **进入项目目录**

   ```bash
   cd zt-ai-vue
   ```

3. **安装依赖**

   ```bash
   npm install
   ```

4. **配置环境变量**

   在项目根目录下创建 `.env.development` 和 `.env.production` 文件，并参考 `.env.example` (如果存在) 配置以下变量：

   ```
   # Vite 基础路径
   VITE_APP_BASE_URL = http://your-backend-api-url
   ```

## 📜 可用脚本

在项目目录中，你可以运行以下命令：

### `npm run dev`

在开发模式下运行应用。
打开 [http://localhost:5173](http://localhost:5173) 在浏览器中查看。

### `npm run build`

为生产环境构建应用。
构建产物会存放在 `dist` 目录中。

### `npm run preview`

在本地预览生产环境的构建产物。
