/**
 * Build version component - displays git commit hash
 * Shows current deployed version for cache validation
 */
export function BuildVersion() {
    // This will be replaced at build time by Vite
    const buildHash = import.meta.env.VITE_BUILD_HASH || '37dbfa7';

    return (
        <div className="text-xs text-muted-foreground">
            Build: {buildHash}
        </div>
    );
}
