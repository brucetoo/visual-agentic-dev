// Components
export { DevToolsProvider, useDevTools } from './components';

// Overlay (advanced usage)
export { Highlighter, SelectionBox } from './overlay';

// Utilities
export {
    parseSourceAttr,
    findSourceElement,
    getSourceFromElement
} from './utils/sourceLocator';

export {
    sendToExtension,
    notifyReady,
    createMessageHandler
} from './utils/messaging';

// Types
export type {
    SourceLocation,
    ElementInfo,
    VDevMessage,
    ElementSelectedPayload
} from './types';
