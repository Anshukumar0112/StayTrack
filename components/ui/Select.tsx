"use client";

import React, { forwardRef } from "react";
import { ChevronDownIcon } from "./Icons";

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  leftIcon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, leftIcon, className = "", id, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-foreground">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-muted pointer-events-none shrink-0">
              {leftIcon}
            </span>
          )}

          <select
            id={selectId}
            ref={ref}
            className={`w-full bg-surface border rounded-lg py-2.5 text-sm font-medium text-foreground appearance-none transition-colors focus-ring cursor-pointer disabled:opacity-50 disabled:bg-surface-muted disabled:cursor-not-allowed ${
              leftIcon ? "pl-10" : "pl-3.5"
            } pr-10 ${
              error
                ? "border-error focus-visible:ring-error/25 focus-visible:border-error"
                : "border-border hover:border-border-hover"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <span className="absolute right-3.5 text-muted pointer-events-none shrink-0">
            <ChevronDownIcon className="w-4 h-4" />
          </span>
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

Select.displayName = "Select";
export default Select;
