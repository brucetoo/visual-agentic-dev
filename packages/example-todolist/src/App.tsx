import { useState } from 'react';
import { DevToolsProvider } from '@visual-agentic-dev/react-devtools';
import { TodoList } from './components/TodoList';
import { AddTodo } from './components/AddTodo';
import { Header } from './components/Header';
import type { Todo } from './types';
import './App.css';

function App() {
    const [todos, setTodos] = useState<Todo[]>([
        { id: 1, text: 'Integrate Visual Agentic Dev Tool', completed: true },
        { id: 2, text: 'Verify babel plugin', completed: false },
        { id: 3, text: 'Test element positioning function', completed: false },
    ]);

    const addTodo = (text: string) => {
        setTodos([...todos, { id: Date.now(), text, completed: false }]);
    };

    const toggleTodo = (id: number) => {
        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const deleteTodo = (id: number) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const invertAllTodos = () => {
        setTodos(todos.filter(todo => !todo.completed));
    };

    return (
        <DevToolsProvider enabled={true}>
            <div className="app">
                <Header />
                <main className="main" style={{ backgroundColor: "lightblue" }}>
                    <AddTodo onAdd={addTodo} onInvertAll={invertAllTodos} />
                    <TodoList todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
                </main>
                <footer className="footer">
                    <p>Click the extension 🔍 button to select any element and view source code position</p>
                </footer>
            </div>
        </DevToolsProvider>
    );
}

export default App;
