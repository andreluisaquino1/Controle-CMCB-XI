import { Card, CardContent } from "@/shared/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    onClick: () => void;
    variant?: "success" | "destructive" | "warning" | "info" | "secondary";
    className?: string;
}

export function ActionCard({
    title,
    description,
    icon: Icon,
    onClick,
    variant = "info",
    className,
}: ActionCardProps) {
    const variants = {
        success: "border-l-success bg-success/5 hover:bg-success/10 text-success",
        destructive: "border-l-destructive bg-destructive/5 hover:bg-destructive/10 text-destructive",
        warning: "border-l-warning bg-warning/5 hover:bg-warning/10 text-warning",
        info: "border-l-primary bg-primary/5 hover:bg-primary/10 text-primary",
        secondary: "border-l-secondary bg-secondary/5 hover:bg-secondary/10 text-secondary",
    };

    const iconVariants = {
        success: "bg-success/10 text-success",
        destructive: "bg-destructive/10 text-destructive",
        warning: "bg-warning/10 text-warning",
        info: "bg-primary/10 text-primary",
        secondary: "bg-secondary/10 text-secondary",
    };

    return (
        <Card
            className={cn(
                "cursor-pointer hover:shadow-elevated transition-all border-l-4 group",
                variants[variant],
                className
            )}
            onClick={onClick}
        >
            <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                        iconVariants[variant]
                    )}>
                        <Icon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
