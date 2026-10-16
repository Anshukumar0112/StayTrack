"use client";

import React from "react";

export type ButtonVariant = "primary" | "sage" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#111716] text-white hover:bg-[#232D2B] active:scale-[0.99] shadow-subtle border border-transparent",
  sage:
    "bg-primary text-white hover:bg-primary-hover active:scale-[0.99] shadow-subtle border border-transparent",
  secondary:
    "bg-surface text-foreground border border-border hover:bg-surface-muted hover:border-border-hover active:scale-[0.99] shadow-subtle",
  outline:
    "bg-transparent text-foreground border border-border hover:bg-surface-muted hover:border-border-hover active:scale-[0.99]",
  ghost:
    "bg-transparent text-foreground hover:bg-surface-muted active:scale-[0.99] border border-transparent",
  danger:
    "bg-error text-white hover:bg-[#B34545] active:scale-[0.99] shadow-subtle border border-transparent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs font-medium gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm font-medium gap-2 rounded-lg",
  lg: "h-12 px-6 text-base font-semibold gap-2.5 rounded-xl",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
