import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrencyInput } from "../components/forms/CurrencyInput";
import React from "react";

describe("CurrencyInput component", () => {
    it("should render with initial value formatted", () => {
        const onChange = vi.fn();
        render(<CurrencyInput value={123.45} onChange={onChange} />);

        const input = screen.getByPlaceholderText("0,00") as HTMLInputElement;
        expect(input.value).toBe("123,45");
    });

    it("should call onChange with numeric value when typing", () => {
        const onChange = vi.fn();
        render(<CurrencyInput value={0} onChange={onChange} />);

        const input = screen.getByPlaceholderText("0,00") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "10,50" } });

        expect(onChange).toHaveBeenCalledWith(10.5);
        expect(input.value).toBe("10,50");
    });

    it("should format value on blur", () => {
        const onChange = vi.fn();
        render(<CurrencyInput value={0} onChange={onChange} />);

        const input = screen.getByPlaceholderText("0,00") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "10.5" } });
        fireEvent.blur(input);

        expect(input.value).toBe("10,50");
    });

    it("should clear input when value is 0 on blur", () => {
        const onChange = vi.fn();
        render(<CurrencyInput value={10} onChange={onChange} />);

        const input = screen.getByDisplayValue("10,00") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "0" } });
        fireEvent.blur(input);

        expect(input.value).toBe("");
        expect(onChange).toHaveBeenCalledWith(0);
    });
});
