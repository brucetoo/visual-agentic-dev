import { createHash } from 'crypto';
import type { SourceLocation, ExecuteResult } from '../types';
import { PromptBuilder } from './PromptBuilder';
import { DevTerminal } from '../utils/DevTerminal';

interface ExecuteOptions {
    projectPath: string;
    source: SourceLocation;
    instruction: string;
    onLog?: (log: string) => void;
}

/**
 * Executes Claude Code CLI via interactive iTerm session
 */
export class ClaudeCodeRunner {
    async execute(options: ExecuteOptions): Promise<ExecuteResult> {
        const { projectPath, source, instruction, onLog } = options;

        const prompt = PromptBuilder.build({ source, instruction });

        // Generate a stable ID for the project session based on path
        const projectId = createHash('md5').update(projectPath).digest('hex').substring(0, 8);

        try {
            onLog?.(`[ClaudeRunner] Target Session: vdev-${projectId}`);

            const exists = await DevTerminal.sessionExists(projectId);

            if (!exists) {
                onLog?.('[ClaudeRunner] Launching new iTerm session...');
                await DevTerminal.launchSession(projectId, projectPath);
            } else {
                onLog?.('[ClaudeRunner] Reusing existing session');
            }

            onLog?.('[ClaudeRunner] Waiting for ccr to be ready...');
            const ready = await DevTerminal.ensureAgentRunning(projectId);

            if (!ready) {
                onLog?.('[ClaudeRunner] Warning: ccr may not be fully ready');
            }

            onLog?.('[ClaudeRunner] Sending instruction...');
            await DevTerminal.sendInput(projectId, prompt);

            return {
                success: true,
                filesModified: [], // Interactive mode doesn't track this automatically
                messages: [],
            };
        } catch (error) {
            onLog?.(`[ClaudeRunner] Error: ${(error as Error).message}`);
            throw error;
        }
    }

    cancel(): void {
        // No-op for interactive terminal mode
        // User handles cancellation in the terminal
    }

    isRunning(): boolean {
        return false; // Stateless
    }
}
