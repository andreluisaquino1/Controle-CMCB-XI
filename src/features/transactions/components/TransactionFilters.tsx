import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Search, X, Calendar as CalendarIcon, Filter } from "lucide-react";
import { DateInput } from "@/shared/components/forms/DateInput";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { format } from "date-fns";
import { cn } from "@/shared/lib/utils";
import { Calendar } from "@/shared/ui/calendar";
import { ptBR } from "date-fns/locale";

interface TransactionFiltersProps {
    startDate: string;
    endDate: string;
    onDateChange: (start: string, end: string) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onClear: () => void;
    isLoading?: boolean;
}

export function TransactionFilters({
    startDate,
    endDate,
    onDateChange,
    searchTerm,
    onSearchChange,
    onClear,
    isLoading
}: TransactionFiltersProps) {
    const [localSearch, setLocalSearch] = useState(searchTerm);

    // Sync local search with prop (debouncing could be added here if needed, but for now direct)
    useEffect(() => {
        setLocalSearch(searchTerm);
    }, [searchTerm]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSearch(e.target.value);
        onSearchChange(e.target.value);
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center bg-muted/20 p-4 rounded-lg border border-border/50 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                <div className="flex gap-2 items-center">
                    <div className="flex-1">
                        <label
                            htmlFor="start-date-filter"
                            className="text-xs font-medium text-muted-foreground mb-1.5 block"
                        >
                            Data Início
                        </label>
                        <DateInput
                            id="start-date-filter"
                            value={startDate}
                            onChange={(date) => onDateChange(date, endDate)}
                        />
                    </div>
                    <div className="flex-1">
                        <label
                            htmlFor="end-date-filter"
                            className="text-xs font-medium text-muted-foreground mb-1.5 block"
                        >
                            Data Fim
                        </label>
                        <DateInput
                            id="end-date-filter"
                            value={endDate}
                            onChange={(date) => onDateChange(startDate, date)}
                        />
                    </div>
                </div>

                <div className="flex-1">
                    <label
                        htmlFor="search-filter"
                        className="text-xs font-medium text-muted-foreground mb-1.5 block"
                    >
                        Busca Textual
                    </label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search-filter"
                            name="search"
                            type="text"
                            placeholder="Buscar por descrição, valor, conta..."
                            className="pl-9 bg-background"
                            value={localSearch}
                            onChange={handleSearchChange}
                        />
                        {localSearch && (
                            <button
                                onClick={() => {
                                    setLocalSearch("");
                                    onSearchChange("");
                                }}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                title="Limpar busca"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <Button
                variant="outline"
                onClick={onClear}
                disabled={isLoading}
                className="h-10 px-4 shrink-0 flex items-center gap-2 border-dashed"
                title="Limpar todos os filtros e redefinir para o mês atual"
            >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Limpar Filtros</span>
            </Button>
        </div>
    );
}
