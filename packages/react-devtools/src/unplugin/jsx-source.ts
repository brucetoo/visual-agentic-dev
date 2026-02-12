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
        enforce: 'pre',

        transform(code: string, id: string) {
            if (!filter(id)) {
                return null;
            }

            const magicString = new MagicString(code);
            let modified = false;

            // Skip if no JSX-like patterns (quick check)
            if (!code.includes('<')) {
                return null;
            }

            // Match JSX opening tags
            // Pattern: <TagName  (but not </TagName or <>)
            const jsxTagRegex = /<([a-zA-Z0-9_$.]+)(\s|>|\/)/g;

            // Improved line counting helper
            const lines = code.split('\n');
            const getLineCol = (index: number) => {
                let currentPos = 0;
                for (let i = 0; i < lines.length; i++) {
                    const lineLength = lines[i].length + 1; // +1 for newline
                    if (currentPos + lineLength > index) {
                        return { line: i + 1, col: index - currentPos };
                    }
                    currentPos += lineLength;
                }
                return { line: lines.length, col: index - currentPos };
            };

            let match;
            while ((match = jsxTagRegex.exec(code)) !== null) {
                const tagName = match[1];
                const tagStartIndex = match.index;
                const afterTagNameIndex = tagStartIndex + 1 + tagName.length;

                // Skip closing tags (though regex avoids < /)
                // Skip fragments <> or < >
                if (!tagName || tagName === 'Fragment') {
                    continue;
                }

                const { line, col } = getLineCol(tagStartIndex);

                // Check if already has our data attribute
                const nextChars = code.slice(afterTagNameIndex, afterTagNameIndex + 100);
                if (nextChars.includes(`data-${prefix}-file`)) {
                    continue;
                }

                // Inject data attributes
                const injection = ` data-${prefix}-file={${JSON.stringify(id)}} data-${prefix}-line="${line}" data-${prefix}-col="${col}"`;

                magicString.appendLeft(afterTagNameIndex, injection);
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
