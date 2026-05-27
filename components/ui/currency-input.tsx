"use client";

import { useState } from "react";

type CurrencyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange" | "type" | "value"
> & {
  name: string;
  defaultValue?: string | number | null;
  value?: string | number | null;
  onValueChange?: (decimalValue: string, formattedValue: string) => void;
};

export function CurrencyInput({
  name,
  defaultValue,
  value,
  onValueChange,
  className,
  onFocus,
  onBlur,
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    formatCurrencyInput(value ?? defaultValue ?? "0"),
  );
  const decimalValue = currencyDisplayToDecimal(displayValue);

  function updateValue(rawValue: string) {
    const formatted = formatCurrencyInput(rawValue);
    setDisplayValue(formatted);
    onValueChange?.(currencyDisplayToDecimal(formatted), formatted);
  }

  return (
    <>
      <input type="hidden" name={name} value={decimalValue} />
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={(event) => {
          if (displayValue === "0,00") {
            setDisplayValue("");
            onValueChange?.("0.00", "");
          }

          onFocus?.(event);
        }}
        onBlur={(event) => {
          if (!displayValue) {
            setDisplayValue("0,00");
            onValueChange?.("0.00", "0,00");
          }

          onBlur?.(event);
        }}
        onChange={(event) => updateValue(event.target.value)}
        className={className}
      />
    </>
  );
}

export function formatCurrencyInput(value: string | number | null | undefined) {
  const digits = getDigits(value);
  const cents = Number.parseInt(digits || "0", 10);
  const amount = cents / 100;

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function currencyDisplayToDecimal(value: string) {
  const digits = getDigits(value);
  const cents = Number.parseInt(digits || "0", 10);

  return (cents / 100).toFixed(2);
}

function getDigits(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (typeof value === "number" || stringValue.includes(".")) {
    const parsed = Number(stringValue.replace(",", "."));

    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 100).toString();
    }
  }

  return stringValue.replace(/\D/g, "");
}
