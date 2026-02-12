
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function StudentForm({ onSubmit, isLoading }: { onSubmit: (name: string) => void; isLoading: boolean }) {
    const [name, setName] = useState("");
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(name); }} className="space-y-4">
            <div className="grid gap-2">
                <Label>Nome Completo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do aluno" required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Cadastrar Aluno</Button>
        </form>
    );
}
