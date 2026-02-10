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
     * Checks if both required tools are installed
     */
    static checkTools(): { claude: boolean; ccr: boolean } {
        return {
            claude: this.checkCommand('claude'),
            ccr: this.checkCommand('ccr'),
        };
    }

    /**
     * Ensures tools are ready, throws error if missing
     */
    static async ensureTools(): Promise<boolean> {
        const { claude, ccr } = this.checkTools();

        if (claude && ccr) {
            return true;
        }

        const missing = [];
        if (!claude) missing.push('claude');
        if (!ccr) missing.push('ccr');

        throw new Error(`Missing required tools: ${missing.join(', ')}. Please install them manually.`);
    }
}
