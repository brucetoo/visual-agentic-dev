# Visual Dev Tool

一个可视化开发工具，让开发者在浏览器中点击 React 元素，通过侧边栏对话描述需求，由 Claude Code CLI 自动执行代码修改。

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建所有包

```bash
pnpm build
```

### 3. 启动 Bridge Server

```bash
# 全局安装后运行
pnpm --filter @visual-dev/bridge-server build
node packages/bridge-server/bin/vdev-server.js

```

### 4. 在你的 React 项目中集成

```bash
# 在你的 React 项目中
npm install /path/to/visual-dev-tool/packages/react-devtools
```

**Webpack 配置:**
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
            plugins: ['@visual-dev/react-devtools/babel-plugin']
          }
        }
      }
    ]
  }
};
```

**Rsbuild 配置:**
```javascript
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [
    pluginReact({
      swcReactOptions: {
        // Rsbuild 默认使用 SWC，需要切换到 Babel
      }
    })
  ],
  tools: {
    babel: {
      plugins: ['@visual-dev/react-devtools/babel-plugin']
    }
  }
});
```

**Vite 配置:**
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['@visual-dev/react-devtools/babel-plugin']
      }
    })
  ]
});
```

```tsx
// App.tsx
import { DevToolsProvider } from '@visual-dev/react-devtools';

function App() {
  return (
    <DevToolsProvider enabled={process.env.NODE_ENV === 'development'}>
      <YourApp />
    </DevToolsProvider>
  );
}
```

### 5. 安装 Chrome 扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `packages/extension/dist` 目录

### 6. 开始使用

1. 启动你的 React 开发服务器
2. 启动 Bridge Server
3. 打开 Chrome 访问 localhost
4. 点击扩展图标打开侧边栏
5. 在设置中配置 Token 和项目路径
6. 点击 🔍 选择页面元素
7. 在聊天框描述修改需求

## 包结构

- `@visual-dev/react-devtools` - React SDK (Babel 插件 + DevToolsProvider)
- `@visual-dev/bridge-server` - WebSocket 服务器 (连接浏览器和 Claude CLI)
- `visual-dev-extension` - Chrome 扩展 (侧边栏 UI)

## License

MIT
