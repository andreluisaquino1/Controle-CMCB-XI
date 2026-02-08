import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateInput } from "@/components/forms/DateInput";
import { getTodayString } from "@/lib/date-utils";
import React from "react";

describe("DateInput component", () => {
    it("should render with today's date by default if value is empty", () => {
        const onChange = vi.fn();
        const { container } = render(<DateInput value="" onChange={onChange} />);

        const today = getTodayString();
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input.value).toBe(today);
    });

    it("should call onChange when date changes", () => {
        const onChange = vi.fn();
        render(<DateInput value="2026-01-01" onChange={onChange} id="date-input" />);

        const input = document.getElementById("date-input") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "2026-02-01" } });

        expect(onChange).toHaveBeenCalledWith("2026-02-01");
    });

    it("should have max attribute set to today", () => {
        render(<DateInput value="" onChange={() => { }} id="date-input" />);
        const input = document.getElementById("date-input") as HTMLInputElement;
        expect(input.getAttribute("max")).toBe(getTodayString());
    });
});
