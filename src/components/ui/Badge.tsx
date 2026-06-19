import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone =
  | "neutral"
  | "accent"
  | "income"
  | "expense"
  | "warning"
  | "info";

interface BadgeProps {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  accent: "bg-accent/10 text-accent-bright border-accent/20",
  income: "bg-income/10 text-income border-income/20",
  expense: "bg-expense/10 text-expense border-expense/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info: "bg-info/10 text-info border-info/20",
};

export default function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
