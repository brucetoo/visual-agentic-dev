import * as _babel_core from '@babel/core';
import { PluginObj } from '@babel/core';

interface PluginOptions {
    /** Prefix for the data attribute (default: 'vdev') */
    prefix?: string;
    /** File patterns to exclude */
    exclude?: RegExp[];
}
declare const _default: (api: object, options: PluginOptions | null | undefined, dirname: string) => PluginObj<_babel_core.PluginPass>;

export { _default as default };
