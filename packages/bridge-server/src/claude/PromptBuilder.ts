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
You need to help me modify the code.

## Target Location
- File: ${source.fileName}
- Line: ${source.lineNumber}
- Column: ${source.columnNumber}

Please first use the view_file tool to check lines ${startLine} to ${endLine} of this file to understand the context.

## Task
${instruction}

## Requirements
1. Modify only necessary code and maintain consistent code style.
2. If adding new components, add imports in appropriate places.
3. If adding styles, use inline styles or add to appropriate style files.
4. Briefly explain what modifications you made after completion.`.trim();
    }
}
