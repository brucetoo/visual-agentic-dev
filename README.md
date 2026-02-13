# Visual Agentic Dev

**Visual Agentic Dev** is an immersive browser development environment designed to allow developers to complete code modifications, debugging, and command-line interactions without leaving the browser. Its core **click-to-locate + agent edit loop** is exactly the kind of workflow that makes AI agents feel genuinely useful—moving beyond a simple "chat in a box" to become a powerful, integrated part of the development lifecycle.

<p align="center">
  <img src="https://github.com/user-attachments/assets/099e936d-880c-4d3a-ab2d-b1f2e9a48556" alt="Visual Agentic Dev - Click → Locate → Agent Edit → Done" width="800" />
</p>

## Core Features

- 🎯 **Zero-Config Source Location**: Utilizes React Fiber to automatically identify source code locations without inserting redundant attributes into business code.
- 📂 **Multi-Project Parallel Development**: Automatically identifies the project belonging to the current Tab and intelligently switches to the corresponding terminal session.
- 🤖 **Dynamic Agent Registry**: Extensible architecture supporting multiple AI agents (Claude Code, CCR, etc.) with dynamic readiness detection.
- 🖱️ **Batch Element Modification**: Supports selecting multiple page elements and sending them to the agent for batch modification.
- ⌨️ **Convenient Shortcuts**: Quick access via `Cmd + Shift + S` (Mac) or `Ctrl + Shift + S` (Windows/Linux).
- 🛠 **Built-in Terminal Integration**: Deeply integrated terminal with session persistence, history restoration, and smart context switching.

## Demo
> demo task description: 
 add one more todo item, not done state, task name is "hey it's new one", clike this new item show dialog and say "you click me"

https://github.com/user-attachments/assets/159da464-4de4-4f5c-a6b0-71da8e27c57e

## Quick Start (Release)

### 1. Install Chrome Extension
- Download from [Chrome Web Store](https://chromewebstore.google.com/) (Coming Soon)
- Or download `extension.zip` from [GitHub Releases](https://github.com/brucetoo/visual-agentic-dev/releases) and load strictly.

### 2. Install Bridge Server
```bash
# Global install (Recommended)
npm install -g @visual-agentic-dev/bridge-server

# Start server
vdev-server
```

### 3. Integrate into React Project
```bash
npm install @visual-agentic-dev/react-devtools
```

```tsx
// App.tsx
import { DevToolsProvider } from '@visual-agentic-dev/react-devtools';

export default function App() {
  return (
    <DevToolsProvider enabled={process.env.NODE_ENV === 'development'}>
      <YourApp />
    </DevToolsProvider>
  );
}
```

### 4. Not Work? Configure Build Plugin (For React 19+)

React 19+ requires a build plugin for accurate source location **due to a breaking change** where `_debugSource` was removed (see [facebook/react#32574](https://github.com/facebook/react/issues/32574)). We provide a universal plugin to restore this functionality.

**Vite Example:**
```ts
// vite.config.ts
import react from '@vitejs/plugin-react';
import { vitePlugin as visualDev } from '@visual-agentic-dev/react-devtools/unplugin';

export default defineConfig({
  plugins: [
    visualDev(), // ⚠️ Must be placed BEFORE react()
    react(),
  ],
});
```

> For other bundlers (Webpack, Rspack, etc.), please see [packages/react-devtools/README.md](packages/react-devtools/README.md).

---

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build All Packages

```bash
pnpm build
```

### 3. Start Bridge Server

```bash
# Build and run
pnpm --filter @visual-agentic-dev/bridge-server build
node packages/bridge-server/bin/vdev-server.js
```

### 4. Integrate into Your React Project

Simply install the SDK and introduce the Provider in your App.

```bash
# In your React project
npm install /path/to/visual-agentic-dev/packages/react-devtools
```

```tsx
// App.tsx
import { DevToolsProvider } from '@visual-agentic-dev/react-devtools';

function App() {
  return (
    <DevToolsProvider enabled={process.env.NODE_ENV === 'development'}>
      <YourApp />
    </DevToolsProvider>
  );
}
```

> **Note for React 19+**: You must also configure the build plugin. See [Build Tool Configuration](#4-configure-build-plugin-required-for-react-19) above.

### 5. Install Chrome Extension

1. Open Chrome and visit `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packages/extension/dist` directory

---

## Usage

### 1. Configure Agent

1. Open the extension sidebar.
2. Click the **Settings** (⚙️) icon.
3. Select your preferred agent (e.g., `ccr code` or `claude`).
4. The terminal session will automatically reset and switch to the selected agent.

### 2. Start Developing

1. Start your React development server
2. Start the Bridge Server
3. Open Chrome and visit localhost
4. Click the extension icon to open the sidebar (it will automatically identify the project path and restore history state)
5. Click the 🔍 button or use the shortcut `Cmd + Shift + S` to select page elements
6. Describe your modification requirements in the chat box

## Troubleshooting

### `Error: posix_spawnp failed` when starting `vdev-server`

This is a known [node-pty issue](https://github.com/microsoft/node-pty/issues/845) where the `spawn-helper` binary lacks execute permissions. Fix it by running:

```bash
chmod +x /your-path/pnpm/global/5/.pnpm/node-pty@1.1.0/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

> Replace `/your-path/` with your actual pnpm global store path. You can find it by running `pnpm store path`.

## Package Structure

- `@visual-agentic-dev/react-devtools` [![version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbrucetoo%2Fvisual-agentic-dev%2Fmain%2Fpackages%2Freact-devtools%2Fpackage.json&query=%24.version&label=sdk)](https://github.com/brucetoo/visual-agentic-dev/blob/main/packages/react-devtools/package.json)
- `@visual-agentic-dev/bridge-server` [![version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbrucetoo%2Fvisual-agentic-dev%2Fmain%2Fpackages%2Fbridge-server%2Fpackage.json&query=%24.version&label=server)](https://github.com/brucetoo/visual-agentic-dev/blob/main/packages/bridge-server/package.json)
- `visual-agentic-dev-extension` [![version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbrucetoo%2Fvisual-agentic-dev%2Fmain%2Fpackages%2Fextension%2Fpackage.json&query=%24.version&label=extension)](https://github.com/brucetoo/visual-agentic-dev/blob/main/packages/extension/package.json)

## Contributing

We love contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## License

© 2026 Bruce Too

Licensed under PolyForm Shield 1.0.0
