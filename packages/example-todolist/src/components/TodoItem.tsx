import { Todo } from '../App';

interface TodoItemProps {
    todo: Todo;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
    return (
        <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
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
                onClick={() => {
                    if (window.confirm('确定要删除这条任务吗？')) {
                        onDelete(todo.id);
                    }
                }}
                aria-label="删除"
            >
                🗑️
            </button>
        </li>
    );
}
