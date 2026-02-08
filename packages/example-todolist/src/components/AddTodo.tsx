import { useState } from 'react';

interface AddTodoProps {
    onAdd: (text: string) => void;
    onInvertAll: () => void;
}

export function AddTodo({ onAdd, onInvertAll }: AddTodoProps) {
    const [text, setText] = useState('');
    const [showModal, setShowModal] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onAdd(text.trim());
            setText('');
        }
    };

    return (
        <>
            <form className="add-todo" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="add-todo-input"
                    placeholder="添加新任务..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button
                    type="submit"
                    className="add-todo-button"
                    style={{ backgroundImage: "linear-gradient(135deg, #ff6b6b, #feca57)" }}
                >
                    提交
                </button>
                <button
                    type="button"
                    className="add-todo-button"
                    style={{ marginLeft: 8, backgroundImage: "linear-gradient(135deg, #54a0ff, #5f27cd)" }}
                    onClick={() => {
                        onInvertAll();
                        setShowModal(true);
                    }}
                >
                    加油呀
                </button>
            </form>
            {showModal ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setShowModal(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div
                        style={{
                            color: "#fff",
                            fontSize: 24,
                            fontWeight: 600,
                        }}
                    >
                        你确定吗？
                    </div>
                </div>
            ) : null}
        </>
    );

}
