import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'unplugin/jsx-source': 'src/unplugin/jsx-source.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    "external": ['react', 'react-dom', '@babel/core', '@babel/types', '@babel/helper-plugin-utils', 'vite', 'magic-string'],
});
