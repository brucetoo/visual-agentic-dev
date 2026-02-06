import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: ['@visual-dev/react-devtools/babel-plugin']
            }
        })
    ],
    server: {
        port: 3000,
        hmr: {
            // Ensure HMR uses WebSocket
            protocol: 'ws',
            // Show overlay for errors
            overlay: true
        }
    }
});


