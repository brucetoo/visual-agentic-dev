import { useState } from 'react';

import type { Todo } from '../types';

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    zIndex: 1000,
} as const;

const drawerStyle = {
    background: '#fff',
    width: 320,
    padding: '20px 16px',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.2)',
} as const;

const drawerContentStyle = {
    fontSize: 16,
    color: '#1f1f1f',
} as const;

const drawerActionsStyle = {
    marginTop: 16,
    display: 'flex',
    justifyContent: 'flex-end',
} as const;

const buttonStyle = {
    border: '1px solid #d9d9d9',
    background: '#fff',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
} as const;

const primaryButtonStyle = {
    ...buttonStyle,
    background: '#f5222d',
    borderColor: '#f5222d',
    color: '#fff',
} as const;

interface TodoItemProps {
    todo: Todo;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const handleConfirmDelete = () => {
        onDelete(todo.id);
        setIsDeleteModalOpen(false);
    };

    const handleItemClick = () => {
        if (todo.text === "hey it's new one") {
            window.alert('you click me');
        }
    };

    return (
        <li
            className={`todo-item ${todo.completed ? 'completed' : ''}`}
            style={{
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                transform: isPressed ? 'scale(0.98)' : 'scale(1)',
            }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            onClick={handleItemClick}
        >
            <label className="todo-label">
                <input
                    type="checkbox"
                    className="todo-checkbox"
                    checked={todo.completed}
                    onChange={() => onToggle(todo.id)}
                />
                <span className="todo-text">{todo.text}</span>
            </label>
            <button
                className="todo-delete"
                onClick={() => setIsDeleteModalOpen(true)}
                aria-label="Delete"
            >
                🗑️
            </button>
            {isDeleteModalOpen ? (
                <div style={overlayStyle} role="dialog" aria-modal="true">
                    <div style={drawerStyle}>
                        <div style={drawerContentStyle}>Hello</div>
                        <div style={drawerActionsStyle}>
                            <button
                                type="button"
                                style={buttonStyle}
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </li>
    );
}
