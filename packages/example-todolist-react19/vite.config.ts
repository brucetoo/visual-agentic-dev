import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vitePlugin as vdevJsxSource } from '@visual-agentic-dev/react-devtools/unplugin';

export default defineConfig({
    plugins: [
        vdevJsxSource(),
        react()
    ],
    server: {
        port: 3010,
        watch: {
            usePolling: true,
            interval: 100
        }
    },
    optimizeDeps: {
        exclude: ['@visual-agentic-dev/react-devtools']
    }
});
