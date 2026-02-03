import { useState, useEffect } from "react";

const STORAGE_KEY = "expense-shortcuts";
const DEFAULT_SHORTCUTS = ["Água", "Água Caixa d'água", "Padaria", "Limpeza", "Papelaria", "Gás"];

export function useExpenseShortcuts() {
    const [shortcuts, setShortcuts] = useState<string[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
    }, [shortcuts]);

    const addShortcut = (name: string) => {
        const trimmed = name.trim();
        if (trimmed && !shortcuts.includes(trimmed)) {
            setShortcuts((prev) => [...prev, trimmed]);
        }
    };

    const removeShortcut = (name: string) => {
        setShortcuts((prev) => prev.filter((s) => s !== name));
    };

    return { shortcuts, addShortcut, removeShortcut };
}
