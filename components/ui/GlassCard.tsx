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
      className={`glass-card rounded-2xl p-6 transition-all duration-300 ${
        hoverEffect ? "hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-indigo-500/10" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
