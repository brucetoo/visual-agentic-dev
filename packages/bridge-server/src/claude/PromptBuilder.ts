import type { SourceLocation } from '../types';

interface BuildOptions {
    source: SourceLocation;
    instruction: string;
}

/**
 * Builds prompts for Claude Code CLI
 */
export class PromptBuilder {
    static build(options: BuildOptions): string {
        const { source, instruction } = options;
        const startLine = Math.max(1, source.lineNumber - 10);
        const endLine = source.lineNumber + 10;

        return `
你需要帮我修改代码。

## 目标位置
- 文件: ${source.fileName}
- 行号: ${source.lineNumber}
- 列号: ${source.columnNumber}

请先使用 view_file 工具查看这个文件的第 ${startLine} 到 ${endLine} 行，了解上下文。

## 任务
${instruction}

## 要求
1. 只修改必要的代码，保持代码风格一致
2. 如果需要添加新组件，请在合适的位置添加 import
3. 如果需要添加样式，请使用内联样式或在合适的样式文件中添加
4. 完成后简要说明你做了什么修改
`.trim();
    }
}
