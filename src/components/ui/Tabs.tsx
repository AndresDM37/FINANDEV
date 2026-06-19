import type { ReactNode } from "react";
import { cn } from "./cn";

interface Tab<T extends string> {
  value: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  tabs: Tab<T>[];
  className?: string;
}

export default function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: TabsProps<T>) {
  return (
    <div className={cn("flex gap-1 border-b border-line", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px",
              active
                ? "text-accent-bright border-b-2 border-accent"
                : "text-muted hover:text-ink border-b-2 border-transparent",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
