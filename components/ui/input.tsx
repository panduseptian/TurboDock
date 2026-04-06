"use client";

import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="label-sm">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-10 w-full rounded-md bg-surface-container-lowest px-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40 focus:shadow-[0_0_12px_2px_rgba(123,208,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed ${error ? "ring-2 ring-error/50" : ""} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  },
);
Input.displayName = "Input";
