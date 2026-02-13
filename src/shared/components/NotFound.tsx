import { Button } from "@/shared/ui/button";
import { Link } from "react-router-dom";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
            <h1 className="text-9xl font-bold font-serif italic text-primary animate-pulse flex items-center gap-2">
                404
            </h1>
            <p className="mt-4 text-2xl font-medium text-muted-foreground max-w-md">
                Oops! A página que você está procurando parece ter sido movida ou não existe.
            </p>

            <div className="mt-8">
                <Button asChild size="lg" className="gap-2">
                    <Link to="/">
                        <MoveLeft className="w-4 h-4" />
                        Voltar ao Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
