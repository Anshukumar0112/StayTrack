import React from "react";

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function ClayCard({
  children,
  className = "",
  ...props
}: ClayCardProps) {
  return (
    <div className={`clay-card p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
