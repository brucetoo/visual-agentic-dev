
export interface AgentConfig {
    name: string;
    command: string; // The command prefix (e.g. 'ccr code', 'claude')
    readyMarkers: string[];
    description?: string;
}

export class AgentRegistry {
    private static agents: Map<string, AgentConfig> = new Map();

    static {
        // Default Agents
        this.register({
            name: 'Claude Code (CCR)',
            command: 'ccr code',
            readyMarkers: [
                'Welcome back',
                'Try "',
                'bypass permissions',
                '\u276F',     // ❯
                '/model to try',
                '> '
            ]
        });

        this.register({
            name: 'Claude Code (Official)',
            command: 'claude',
            readyMarkers: [
                'Welcome back',
                'Try "',
                'bypass permissions',
                '\u276F',
                '/model to try',
                '> '
            ]
        });
    }

    static register(config: AgentConfig) {
        this.agents.set(config.command, config);
    }

    static get(command: string): AgentConfig | undefined {
        return this.agents.get(command);
    }

    static getAll(): AgentConfig[] {
        return Array.from(this.agents.values());
    }

    static getReadyMarkers(command: string): string[] {
        const config = this.get(command);
        // Return specific markers if found, otherwise basic fallback
        return config?.readyMarkers || ['> ', '$ ', '# ', '\u276F'];
    }
}
