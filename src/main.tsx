import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

const polyfillCrypto = () => {
    try {
        if (typeof window !== "undefined" && !window.crypto.randomUUID) {
            Object.defineProperty(window.crypto, 'randomUUID', {
                value: () => {
                    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) => {
                        const random = (window.crypto.getRandomValues && window.crypto.getRandomValues(new Uint8Array(1))[0]) || Math.floor(Math.random() * 256);
                        return (Number(c) ^ random & 15 >> (Number(c) / 4)).toString(16);
                    }) as `${string}-${string}-${string}-${string}-${string}`;
                },
                configurable: true,
                writable: true
            });
        }
    } catch (e) {
        console.warn("Could not polyfill crypto.randomUUID", e);
    }
};

polyfillCrypto();

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

