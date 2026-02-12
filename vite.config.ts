import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 加载所有环境变量（包括 GitHub 和 Vercel 自动注入的系统变量）
    const env = loadEnv(mode, process.cwd(), '');

    // 🔍 核心逻辑：自动判断环境
    // GitHub Actions 会自动设置 GITHUB_ACTIONS 环境变量为 'true'
    const isGitHubPages = env.GITHUB_ACTIONS === 'true';

    return {
      // 🤖 智能切换 Base 路径
      // 如果是 GitHub，用子路径 '/official-site/'
      // 否则（Vercel 或 本地开发），用根路径 '/'
      base: isGitHubPages ? '/official-site/' : '/',

      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
