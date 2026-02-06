import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { rename, mkdir, rm } from 'fs/promises';

// Plugin to fix HTML output path for Chrome extension
function fixHtmlOutputPath(): Plugin {
    return {
        name: 'fix-html-output-path',
        closeBundle: async () => {
            const distDir = resolve(__dirname, 'dist');
            const srcHtml = resolve(distDir, 'src/sidepanel/index.html');
            const destHtml = resolve(distDir, 'sidepanel/index.html');
            
            try {
                // Move HTML file from dist/src/sidepanel/ to dist/sidepanel/
                await rename(srcHtml, destHtml);
                // Remove the empty src directory
                await rm(resolve(distDir, 'src'), { recursive: true, force: true });
                console.log('✓ Fixed sidepanel HTML path');
            } catch (e) {
                console.error('Failed to fix HTML path:', e);
            }
        }
    };
}

export default defineConfig({
    plugins: [react(), fixHtmlOutputPath()],
    build: {
        outDir: 'dist',
        emptyDirBeforeWrite: true,
        rollupOptions: {
            input: {
                sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
                background: resolve(__dirname, 'src/background/service-worker.ts'),
                content: resolve(__dirname, 'src/content/content-script.ts'),
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === 'background') return 'background/service-worker.js';
                    if (chunkInfo.name === 'content') return 'content/content-script.js';
                    return '[name]/[name].js';
                },
                chunkFileNames: 'shared/[name].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name?.endsWith('.css')) return 'sidepanel/[name][extname]';
                    return 'assets/[name][extname]';
                },
            },
        },
    },
    publicDir: 'public',
});
