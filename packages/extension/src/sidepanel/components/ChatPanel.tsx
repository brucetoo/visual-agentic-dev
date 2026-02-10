import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../../shared/types';

interface ChatPanelProps {
    messages: Message[];
    onSend: (instruction: string) => void;
    onClear: () => void;
    disabled: boolean;
    placeholder: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    onSend,
    onClear,
    disabled,
    placeholder,
}) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || disabled) return;

        onSend(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="chat-panel">
            <div className="message-list">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <p>👋 Select page elements, then describe your desired changes</p>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                            {msg.content}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-input" onSubmit={handleSubmit}>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={2}
                />
                <div className="input-actions">
                    <button type="submit" disabled={disabled || !input.trim()}>
                        Send
                    </button>
                    {messages.length > 0 && (
                        <button type="button" onClick={onClear} className="clear-btn">
                            Clear
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};
