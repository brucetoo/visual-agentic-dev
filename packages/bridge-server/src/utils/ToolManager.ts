import { execSync } from 'child_process';

export class ToolManager {
    /**
     * Checks if a command exists in the system PATH
     */
    static checkCommand(command: string): boolean {
        try {
            execSync(`which ${command}`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Checks if the required tool is installed.
     * If command involves 'ccr', we also check 'claude'.
     */
    static checkTools(command: string): { [key: string]: boolean } {
        const executable = command.split(' ')[0];
        const result: { [key: string]: boolean } = {
            [executable]: this.checkCommand(executable)
        };

        if (executable === 'ccr') {
            result['claude'] = this.checkCommand('claude');
        }

        return result;
    }

    /**
     * Ensures tools are ready, throws error if missing
     */
    static async ensureTools(command: string = 'ccr code'): Promise<boolean> {
        const status = this.checkTools(command);
        const missing = Object.keys(status).filter(tool => !status[tool]);

        if (missing.length === 0) {
            return true;
        }

        throw new Error(`Missing required tools: ${missing.join(', ')}. Please install them manually.`);
    }
}
