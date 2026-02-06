import { Plugin } from 'vite';

interface VdevPluginOptions {
    /** Prefix for the data attribute (default: 'vdev') */
    prefix?: string;
    /** File patterns to exclude */
    exclude?: RegExp[];
}
/**
 * Vite plugin to inject source location data attributes into JSX elements.
 * This enables the Visual Dev Tool to locate source code from rendered elements.
 *
 * Works with @vitejs/plugin-react-swc for stable HMR support.
 */
declare function vdevJsxSource(options?: VdevPluginOptions): Plugin;

export { type VdevPluginOptions, vdevJsxSource as default, vdevJsxSource };
