"use client";

import React, { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-foreground">
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          className={`w-full bg-surface border rounded-lg p-3 text-sm font-normal text-foreground placeholder:text-muted/60 transition-colors focus-ring disabled:opacity-50 disabled:bg-surface-muted disabled:cursor-not-allowed ${
            error
              ? "border-error focus-visible:ring-error/25 focus-visible:border-error"
              : "border-border hover:border-border-hover"
          } ${className}`}
          {...props}
        />

        {error ? (
          <p className="text-[11px] font-medium text-error">{error}</p>
        ) : hint ? (
          <p className="text-[11px] font-medium text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
