import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Polyfill for crypto.randomUUID
if (!crypto.randomUUID) {
    // @ts-ignore
    crypto.randomUUID = () => {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) => {
            const random = (crypto.getRandomValues && crypto.getRandomValues(new Uint8Array(1))[0]) || Math.floor(Math.random() * 256);
            return (c ^ random & 15 >> (c / 4)).toString(16);
        }) as `${string}-${string}-${string}-${string}-${string}`;
    };
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

