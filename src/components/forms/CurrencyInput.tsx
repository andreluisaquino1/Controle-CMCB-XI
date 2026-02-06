import { Input } from "@/components/ui/input";
import { useState, useEffect, ChangeEvent, FocusEvent } from "react";
import { parseCurrencyBRL, formatCurrencyBRL } from "@/lib/currency";

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
  const [displayValue, setDisplayValue] = useState(
    value !== 0 ? value.toFixed(2).replace(".", ",") : ""
  );

  // Sync displayValue when value changes from outside (e.g., calculated values)
  useEffect(() => {
    if (disabled) {
      setDisplayValue(value !== 0 ? value.toFixed(2).replace(".", ",") : "");
    }
  }, [value, disabled]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Allow typing numbers, comma, period
    const input = e.target.value.replace(/[^\d,.-]/g, "");
    setDisplayValue(input);

    // Parse and update parent
    const numericValue = parseCurrencyBRL(input);
    onChange(numericValue);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    // Format on blur
    const numericValue = parseCurrencyBRL(displayValue);
    if (numericValue > 0) {
      setDisplayValue(numericValue.toFixed(2).replace(".", ","));
    } else {
      setDisplayValue("");
    }
    onChange(numericValue);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
