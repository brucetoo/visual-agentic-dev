import { createUnplugin } from 'unplugin';
import { createFilter } from '@rollup/pluginutils';
import MagicString from 'magic-string';

export interface VdevPluginOptions {
    /** Prefix for the data attribute (default: 'vdev') */
    prefix?: string;
    /** File patterns to include (default: /\.[jt]sx$/) */
    include?: RegExp[] | string[];
    /** File patterns to exclude (default: [/node_modules/]) */
    exclude?: RegExp[] | string[];
}

export const unplugin = createUnplugin((options: VdevPluginOptions | undefined = {}) => {
    const prefix = options.prefix || 'vdev';
    const filter = createFilter(
        options.include || [/\.[jt]sx$/],
        options.exclude || [/node_modules/]
    );

    return {
        name: 'vdev-jsx-source',
        enforce: 'post',

        transform(code: string, id: string) {
            if (!filter(id)) {
                return null;
            }

            // Skip if no JSX-like patterns (quick check)
            if (!code.includes('jsx(') && !code.includes('jsxs(') && !code.includes('jsxDEV(')) {
                return null;
            }

            const magicString = new MagicString(code);
            let modified = false;

            // Match jsx/jsxs/jsxDEV function calls
            // Pattern: jsx("tagName", { props })  or  jsx(Component, { props })
            const jsxCallRegex = /\b(jsx|jsxs|jsxDEV)\s*\(\s*(?:"([^"]+)"|'([^']+)'|([A-Z][a-zA-Z0-9_$.]*)|([a-z][a-zA-Z0-9_]*))\s*,\s*\{/g;

            // Simple line counting helper
            // Note: This could be optimized but serves for now
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

                // Skip React Fragments (they don't support custom props)
                const componentName = match[4] || match[5]; // Capture group 4 is Capitalized, 5 is lowercase
                if (componentName && (componentName === 'Fragment' || componentName === 'React.Fragment')) {
                    continue;
                }

                const { line, col } = getLineCol(match.index);

                // Check if already has our data attribute
                // Optimization: check next 100 chars
                const nextChars = code.slice(openBraceIndex + 1, openBraceIndex + 100);
                if (nextChars.includes(`"data-${prefix}-file"`)) {
                    continue;
                }

                // Inject data attributes as first properties
                // We use JSON.stringify for the file path to ensure it's properly escaped
                const injection = `"data-${prefix}-file": ${JSON.stringify(id)}, "data-${prefix}-line": "${line}", "data-${prefix}-col": "${col}", `;

                magicString.appendLeft(openBraceIndex + 1, injection);
                modified = true;
            }

            if (!modified) {
                return null;
            }

            return {
                code: magicString.toString(),
                map: magicString.generateMap({ hires: true, source: id })
            };
        },
    };
});

export const vitePlugin = unplugin.vite;
export const rollupPlugin = unplugin.rollup;
export const webpackPlugin = unplugin.webpack;
export const rspackPlugin = unplugin.rspack;
export const esbuildPlugin = unplugin.esbuild;
