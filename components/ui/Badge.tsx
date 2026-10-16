"use client";

import React from "react";

export type BadgeVariant =
  | "verified"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "sage"
  | "neutral"
  | "dark";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  pulseDot?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  verified: {
    container: "bg-[#EAF4F0] text-[#3F8A68] border-[#3F8A68]/20",
    dot: "bg-[#3F8A68]",
  },
  success: {
    container: "bg-success-light text-success border-success/25",
    dot: "bg-success",
  },
  warning: {
    container: "bg-warning-light text-[#B88728] border-warning/25",
    dot: "bg-warning",
  },
  error: {
    container: "bg-error-light text-error border-error/25",
    dot: "bg-error",
  },
  info: {
    container: "bg-info-light text-info border-info/25",
    dot: "bg-info",
  },
  sage: {
    container: "bg-primary-light text-primary-dark border-primary/20",
    dot: "bg-primary",
  },
  neutral: {
    container: "bg-surface-muted text-muted border-border",
    dot: "bg-muted",
  },
  dark: {
    container: "bg-[#111716] text-white border-[#111716]",
    dot: "bg-white",
  },
};

export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  pulseDot = false,
  icon,
  className = "",
  ...props
}: BadgeProps) {
  const current = variantStyles[variant] || variantStyles.neutral;
  const sizeClasses = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider rounded-md border ${sizeClasses} ${current.container} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${current.dot} ${
            pulseDot ? "animate-pulse" : ""
          }`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
