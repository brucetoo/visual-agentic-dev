# Visual Dev Tool

一个可视化开发工具，让开发者在浏览器中点击 React 元素，通过侧边栏对话描述需求，由 Claude Code CLI 自动执行代码修改。

## 示例
![alt text](image.png)

## 本地快速开始

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

#### A. 运行时方案 (推荐 - 零配置，HMR 稳定)

只需安装 SDK 并在 App 中引入 Provider，即可利用 React Fiber 自动获取源码位置。

```bash
# 在你的 React 项目中
npm install /path/to/visual-dev-tool/packages/react-devtools
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

> [!TIP]
> **为什么要用这个方案？**
> 任何编译时插件（Babel/Vite Transform）都会干扰 React 的热更新（HMR）。运行时方案完全无侵入，性能更好，且 HMR 绝对稳定。

#### B. 编译插件方案 (不到万不得已不用系列)

如果你需要支持非 React 环境或有特殊定位需求，可以使用以下插件：

**Vite 配置:**
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { vdevJsxSource } from '@visual-dev/react-devtools/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    vdevJsxSource()
  ],
  optimizeDeps: {
    exclude: ['@visual-dev/react-devtools']
  }
});
```

**Webpack / Babel 配置:**
```javascript
// babel.config.js
module.exports = {
  plugins: ['@visual-dev/react-devtools/babel-plugin']
};
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
5. 在设置中配置项目路径
6. 点击 🔍 选择页面元素
7. 在聊天框描述修改需求

## 包结构

- `@visual-dev/react-devtools` - React SDK (运行时定位 + 可选插件)
- `@visual-dev/bridge-server` - WebSocket 服务器 (连接浏览器和 Claude CLI)
- `visual-dev-extension` - Chrome 扩展 (侧边栏 UI)

## License

Bruce Too
