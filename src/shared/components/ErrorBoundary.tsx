import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-card text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-4">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground mb-2">Ops! Algo deu errado.</h1>
                        <p className="text-muted-foreground mb-6">
                            Ocorreu um erro inesperado que impediu o carregamento da página.
                        </p>

                        {import.meta.env.DEV && (
                            <div className="mb-6 p-3 bg-muted rounded text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-destructive break-all">
                                    {this.state.error?.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Recarregar Página
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = "/"}
                                className="w-full"
                            >
                                Voltar ao Início
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
