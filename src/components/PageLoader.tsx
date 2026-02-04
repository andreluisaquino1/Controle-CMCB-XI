import { Loader2 } from "lucide-react";

export function PageLoader() {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                    Carregando...
                </p>
            </div>
        </div>
    );
}
