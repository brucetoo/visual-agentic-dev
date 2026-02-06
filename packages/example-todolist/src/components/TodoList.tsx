import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

interface TodoListProps {
    todos: Todo[];
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
    if (todos.length === 0) {
        return (
            <div className="todo-empty">
                <p>🎉 没有待办事项！</p>
            </div>
        );
    }

    return (
        <ul className="todo-list">
            {todos.map(todo => (
                <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggle}
                    onDelete={onDelete}
                />
            ))}
        </ul>
    );
}
