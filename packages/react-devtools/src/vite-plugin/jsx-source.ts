import type { Plugin, TransformResult } from 'vite';
import MagicString from 'magic-string';

export interface VdevPluginOptions {
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
export function vdevJsxSource(options: VdevPluginOptions = {}): Plugin {
    const prefix = options.prefix || 'vdev';
    const exclude = options.exclude || [/node_modules/];

    return {
        name: 'vdev-jsx-source',
        // Use 'post' to run after other transforms, avoiding HMR issues
        enforce: 'post',

        transform(code: string, id: string): TransformResult | null {
            // Skip excluded files
            if (exclude.some(pattern => pattern.test(id))) {
                return null;
            }

            // Only process JSX/TSX files
            if (!/\.[jt]sx$/.test(id)) {
                return null;
            }

            // Skip if no JSX-like patterns (quick check)
            if (!code.includes('jsx(') && !code.includes('jsxs(') && !code.includes('jsxDEV(')) {
                return null;
            }

            // After SWC transform, JSX becomes function calls like:
            // jsx("div", { ... }) or jsxDEV("div", { ... }, ...)
            // We inject our data attributes into the props object

            const magicString = new MagicString(code);
            let modified = false;

            // Match jsx/jsxs/jsxDEV function calls
            // Pattern: jsx("tagName", { props })  or  jsx(Component, { props })
            const jsxCallRegex = /\b(jsx|jsxs|jsxDEV)\s*\(\s*(?:"([^"]+)"|'([^']+)'|([A-Z][a-zA-Z0-9_$.]*)|([a-z][a-zA-Z0-9_]*))\s*,\s*\{/g;

            // Track line numbers for source location
            const lines = code.split('\n');
            const getLineCol = (index: number) => {
                let line = 1;
                let lastNewline = -1;
                for (let i = 0; i < index && i < code.length; i++) {
                    if (code[i] === '\n') {
                        line++;
                        lastNewline = i;
                    }
                }
                return { line, col: index - lastNewline - 1 };
            };

            let match;
            while ((match = jsxCallRegex.exec(code)) !== null) {
                const openBraceIndex = match.index + match[0].length - 1;
                const { line, col } = getLineCol(match.index);

                // Check if already has our data attribute
                const nextChars = code.slice(openBraceIndex + 1, openBraceIndex + 100);
                if (nextChars.includes(`"data-${prefix}-file"`)) {
                    continue;
                }

                // Inject data attributes as first properties
                const injection = `"data-${prefix}-file": "${id}", "data-${prefix}-line": "${line}", "data-${prefix}-col": "${col}", `;

                magicString.appendLeft(openBraceIndex + 1, injection);
                modified = true;
            }

            if (!modified) {
                return null;
            }

            return {
                code: magicString.toString(),
                map: magicString.generateMap({ hires: true })
            };
        }
    };
}

export default vdevJsxSource;
