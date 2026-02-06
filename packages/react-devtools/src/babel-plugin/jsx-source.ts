import { declare } from '@babel/helper-plugin-utils';
import type { PluginObj, NodePath } from '@babel/core';
import * as t from '@babel/types';

interface PluginOptions {
    /** Prefix for the data attribute (default: 'vdev') */
    prefix?: string;
    /** File patterns to exclude */
    exclude?: RegExp[];
}

export default declare((api, options: PluginOptions): PluginObj => {
    api.assertVersion(7);

    const prefix = options.prefix || 'vdev';
    const exclude = options.exclude || [/node_modules/];

    return {
        name: 'visual-dev-jsx-source',
        visitor: {
            JSXOpeningElement(path: NodePath<t.JSXOpeningElement>, state) {
                const filename = state.filename || '';

                // Check if file should be excluded
                if (exclude.some(pattern => pattern.test(filename))) {
                    return;
                }

                const { line, column } = path.node.loc?.start || {};

                if (!filename || line === undefined) return;

                // Check if attribute already exists
                const hasAttr = path.node.attributes.some(
                    attr => t.isJSXAttribute(attr) &&
                        (attr.name.name === `data-${prefix}-file` ||
                            attr.name.name === `data-${prefix}-source`)
                );

                if (hasAttr) return;

                // Use separate attributes to avoid JSON escaping issues with esbuild
                // Format: data-vdev-file, data-vdev-line, data-vdev-col
                const fileAttr = t.jsxAttribute(
                    t.jsxIdentifier(`data-${prefix}-file`),
                    t.stringLiteral(filename)
                );

                const lineAttr = t.jsxAttribute(
                    t.jsxIdentifier(`data-${prefix}-line`),
                    t.stringLiteral(String(line))
                );

                const colAttr = t.jsxAttribute(
                    t.jsxIdentifier(`data-${prefix}-col`),
                    t.stringLiteral(String(column))
                );

                path.node.attributes.push(fileAttr, lineAttr, colAttr);
            },
        },
    };
});

