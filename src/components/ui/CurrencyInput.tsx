import React, { forwardRef } from "react";
import Input from "./Input";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  iconPosition?: "left" | "right";
  inputSize?: "sm" | "md" | "lg";
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ iconPosition = "left", inputSize, onFocus, ...props }, ref) => (
    <Input
      {...props}
      ref={ref}
      type="number"
      step="0.01"
      icon={<span aria-hidden="true">{"\u20B9"}</span>}
      iconPosition={iconPosition}
      inputSize={inputSize}
      onFocus={(event) => {
        event.target.select();
        onFocus?.(event);
      }}
    />
  )
);

export default CurrencyInput;
