import type { ReactNode } from "react";
import { cn } from "./cn";

interface Segment<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  segments: Segment<T>[];
  className?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex w-full rounded-xl bg-surface-2 border border-line p-1 gap-1",
        className,
      )}
    >
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            type="button"
            onClick={() => onChange(seg.value)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-ground"
                : "text-muted hover:text-ink",
            )}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
