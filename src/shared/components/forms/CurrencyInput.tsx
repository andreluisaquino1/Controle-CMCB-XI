import { Input } from "@/shared/ui/input";
import { useState, useEffect, ChangeEvent, FocusEvent, useRef } from "react";
import { parseCurrencyBRL } from "@/shared/lib/currency";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  disabled = false,
  id,
}: CurrencyInputProps) {
  // Use a ref to track the last numeric value we already processed/notified
  // to avoid re-formatting while the user is still typing (e.g., "1," -> "1,0")
  const lastProcessedValue = useRef<number>(value);

  const [displayValue, setDisplayValue] = useState(
    value !== 0 ? value.toFixed(2).replace(".", ",") : ""
  );

  // Sync displayValue ONLY when value prop changes significantly from our last processed value
  // (e.g., external reset to 0 or manual calculation from another field)
  useEffect(() => {
    if (value !== lastProcessedValue.current) {
      lastProcessedValue.current = value;
      setDisplayValue(value !== 0 ? value.toFixed(2).replace(".", ",") : "");
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^\d,.-]/g, "");
    setDisplayValue(input);

    const numericValue = parseCurrencyBRL(input);
    lastProcessedValue.current = numericValue;
    onChange(numericValue);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const numericValue = parseCurrencyBRL(displayValue);
    if (numericValue !== 0) {
      setDisplayValue(numericValue.toFixed(2).replace(".", ","));
    } else {
      setDisplayValue("");
    }
    // Final sync (evita disparar onChange duas vezes com o mesmo valor)
    if (numericValue !== lastProcessedValue.current) {
      lastProcessedValue.current = numericValue;
      onChange(numericValue);
    }
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
