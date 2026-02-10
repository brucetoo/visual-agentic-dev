import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        watch: {
            usePolling: true,
            interval: 100
        }
    },
    optimizeDeps: {
        exclude: ['@visual-agentic-dev/react-devtools']
    }
});
