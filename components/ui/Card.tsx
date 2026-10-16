"use client";

import React from "react";

export type CardVariant = "standard" | "interactive" | "elevated" | "muted";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  standard: "bg-surface border border-border rounded-xl p-5 shadow-subtle",
  interactive:
    "bg-surface border border-border rounded-xl p-5 shadow-subtle hover:border-border-hover hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
  elevated: "bg-surface border border-border rounded-xl p-6 shadow-elevated",
  muted: "bg-surface-muted border border-border-subtle rounded-xl p-5",
};

export default function Card({
  children,
  variant = "standard",
  className = "",
  ...props
}: CardProps) {
  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
