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
     * Attempts to install the missing tools
     */
    static async installTools(): Promise<boolean> {
        const { claude, ccr } = this.checkTools();

        if (claude && ccr) {
            console.log('[ToolManager] All tools are already installed.');
            return true;
        }

        try {
            if (!claude) {
                console.log('[ToolManager] Installing @anthropic-ai/claude-code...');
                execSync('npm install -g @anthropic-ai/claude-code', { stdio: 'inherit' });
            }
            if (!ccr) {
                console.log('[ToolManager] Installing @musistudio/claude-code-router...');
                execSync('npm install -g @musistudio/claude-code-router', { stdio: 'inherit' });
            }
            return true;
        } catch (error) {
            console.error(`[ToolManager] Installation failed: ${(error as Error).message}`);
            return false;
        }
    }

    /**
     * Ensures tools are ready, installs if necessary
     */
    static async ensureTools(): Promise<boolean> {
        const status = this.checkTools();
        if (status.claude && status.ccr) return true;

        console.log('[ToolManager] Some tools are missing. Attempting auto-installation...');
        return await this.installTools();
    }
}
