"use client";

import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-foreground">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-muted pointer-events-none shrink-0">
              {leftIcon}
            </span>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-surface border rounded-lg py-2.5 text-sm font-normal text-foreground placeholder:text-muted/60 transition-colors focus-ring disabled:opacity-50 disabled:bg-surface-muted disabled:cursor-not-allowed ${
              leftIcon ? "pl-10" : "pl-3.5"
            } ${rightIcon ? "pr-10" : "pr-3.5"} ${
              error
                ? "border-error focus-visible:ring-error/25 focus-visible:border-error"
                : "border-border hover:border-border-hover"
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3.5 text-muted pointer-events-none shrink-0">
              {rightIcon}
            </span>
          )}
        </div>

        {error ? (
          <p className="text-[11px] font-medium text-error">{error}</p>
        ) : hint ? (
          <p className="text-[11px] font-medium text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
