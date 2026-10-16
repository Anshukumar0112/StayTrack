import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export default function GlassCard({
  children,
  className = "",
  hoverEffect = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 transition-all duration-200 ${
        hoverEffect ? "hover:-translate-y-0.5 hover:border-border-hover hover:shadow-elevated" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
