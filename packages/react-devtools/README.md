# @visual-agentic-dev/react-devtools

The React runtime SDK for Visual Agentic Dev. This package provides the connection between your React application and the Visual Dev browser extension.

## Integration

### 1. Install

```bash
npm install @visual-agentic-dev/react-devtools
# or
pnpm add @visual-agentic-dev/react-devtools
# or
yarn add @visual-agentic-dev/react-devtools
```

### 2. Runtime Setup (Required)

Wrap your root application with `DevToolsProvider`:

```tsx
// App.tsx or main.tsx
import { DevToolsProvider } from '@visual-agentic-dev/react-devtools';

export default function App() {
  return (
    <DevToolsProvider enabled={process.env.NODE_ENV === 'development'}>
      <YourApp />
    </DevToolsProvider>
  );
}
```

## React 19 Support & Source Location

For **React 16, 17, and 18**, the runtime SDK can usually detect source location (file path, line number) automatically using React's internal fiber information.

For **React 19+**, due to internal changes in React Fiber (removal of `_debugSource`), runtime detection may be unreliable or fail completely.

**We strongly recommend configuring the build plugin** to ensure 100% accurate source location detection across all React versions and build tools.

### Build Tool Configuration

We provide an **Universal Plugin** (unplugin) that supports Vite, Webpack, Rspack, Rollup, and esbuild.

#### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vitePlugin as visualDev } from '@visual-agentic-dev/react-devtools/unplugin';

export default defineConfig({
  plugins: [
    visualDev(), // ⚠️ Must be placed BEFORE react()
    react(),
  ],
});
```

> **⚠️ Plugin Ordering**: `visualDev()` must be placed **before** `react()` in the plugins array. This ensures source location attributes are injected before React processes the JSX.

#### Webpack

```js
// webpack.config.js
const { webpackPlugin: visualDev } = require('@visual-agentic-dev/react-devtools/unplugin');

module.exports = {
  // ...
  plugins: [
    visualDev(),
  ],
};
```

#### Rspack

```js
// rspack.config.js
const { rspackPlugin: visualDev } = require('@visual-agentic-dev/react-devtools/unplugin');

module.exports = {
  // ...
  plugins: [
    visualDev(),
  ],
};
```

#### Next.js (Webpack)

```js
// next.config.js
const { webpackPlugin: visualDev } = require('@visual-agentic-dev/react-devtools/unplugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.plugins.push(visualDev());
    return config;
  },
};

module.exports = nextConfig;
```

#### Rollup

```js
// rollup.config.js
import { rollupPlugin as visualDev } from '@visual-agentic-dev/react-devtools/unplugin';

export default {
  // ...
  plugins: [
    visualDev(),
  ],
};
```

## Options

The plugin accepts an options object:

```ts
visualDev({
  // Filter files to transform
  include: [/\.[jt]sx$/], // default
  exclude: [/node_modules/], // default
  
  // Customize the data attribute prefix
  // default: 'vdev' -> data-vdev-file, data-vdev-line
  prefix: 'vdev', 
})
```
