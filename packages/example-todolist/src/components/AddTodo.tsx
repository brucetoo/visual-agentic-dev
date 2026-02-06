import { useState } from 'react';

interface AddTodoProps {
    onAdd: (text: string) => void;
    onInvertAll: () => void;
}

export function AddTodo({ onAdd, onInvertAll }: AddTodoProps) {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text.trim());
            setText('');
        }
    };

    return (
        <form className="add-todo" onSubmit={handleSubmit}>
            <input
                type="text"
                className="add-todo-input"
                placeholder="添加新任务..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="add-todo-button" style={{ backgroundColor: "red" }}>
                添加
            </button>
            <button
                type="button"
                className="add-todo-button"
                style={{ marginLeft: 8 }}
                onClick={onInvertAll}
            >
                取消
            </button>
        </form>
    );
}
