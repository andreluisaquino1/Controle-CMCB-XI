import { Input } from "@/components/ui/input";
import { getTodayString } from "@/lib/date-utils";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  required?: boolean;
}

export function DateInput({
  value,
  onChange,
  disabled = false,
  id,
  required = true,
}: DateInputProps) {
  return (
    <Input
      id={id}
      type="date"
      value={value || getTodayString()}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      max={getTodayString()}
    />
  );
}
