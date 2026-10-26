"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, CheckIcon } from "@/components/ui/Icons";

export interface StatusFilterOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface StatusFilterDropdownProps<T extends string = string> {
  labelPrefix?: string;
  headerTitle?: string;
  options: StatusFilterOption<T>[];
  activeValue: T;
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export default function StatusFilterDropdown<T extends string = string>({
  labelPrefix = "Status",
  headerTitle = "Filter by Status",
  options,
  activeValue,
  onChange,
  className = "",
  buttonClassName = "",
  menuClassName = "",
}: StatusFilterDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((opt) => opt.value === activeValue) || options[0];

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button: Pill container matching staytrack design reference */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`h-10 px-4 rounded-full border border-border bg-surface hover:bg-surface-muted/60 text-foreground transition-all flex items-center justify-between sm:justify-start gap-2.5 shadow-2xs focus-ring text-xs font-semibold cursor-pointer select-none ${
          isOpen ? "border-foreground/30 bg-surface-muted/50" : ""
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {labelPrefix && <span className="text-muted font-normal">{labelPrefix}:</span>}
          <span className="font-semibold text-foreground truncate">
            {activeOption?.label || "All"}
          </span>
        </span>

        {typeof activeOption?.count === "number" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-surface-muted text-muted border border-border shrink-0">
            {activeOption.count}
          </span>
        )}

        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-muted transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
        />
      </button>

      {/* Popover Menu Surface matching media_1792339223805.png */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute right-0 top-full mt-1.5 w-60 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface border border-border shadow-elevated p-1.5 z-50 animate-in fade-in zoom-in-95 ${menuClassName}`}
        >
          {headerTitle && (
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-2.5 py-1.5 select-none">
              {headerTitle}
            </div>
          )}

          <div className="flex flex-col gap-0.5 max-h-80 overflow-y-auto scrollbar-none">
            {options.map((opt) => {
              const isSelected = opt.value === activeValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs cursor-pointer focus-ring flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-surface-muted text-foreground font-semibold"
                      : "hover:bg-surface-muted/60 text-muted hover:text-foreground font-medium"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {typeof opt.count === "number" && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected
                            ? "bg-surface text-foreground shadow-2xs border border-border/80"
                            : "bg-surface-muted text-muted"
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                    {isSelected ? (
                      <CheckIcon className="w-3.5 h-3.5 text-foreground stroke-[2.5]" />
                    ) : (
                      <div className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
