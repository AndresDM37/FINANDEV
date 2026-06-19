import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "default" | "accent" | "income" | "expense" | "info" | "warning";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}

const TONES: Record<Tone, { card: string; value: string; icon: string }> = {
  default: { card: "bg-surface border border-line", value: "text-ink", icon: "text-muted" },
  accent: {
    card: "bg-gradient-to-br from-accent/15 to-surface border border-accent/20",
    value: "text-accent-bright",
    icon: "text-accent",
  },
  income: { card: "bg-surface border border-line", value: "text-income", icon: "text-income" },
  expense: { card: "bg-surface border border-line", value: "text-expense", icon: "text-expense" },
  info: { card: "bg-surface border border-line", value: "text-info", icon: "text-info" },
  warning: { card: "bg-surface border border-line", value: "text-warning", icon: "text-warning" },
};

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: StatCardProps) {
  const t = TONES[tone];
  return (
    <div className={cn("rounded-2xl p-4 flex flex-col gap-2", t.card, className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
        {icon && <span className={t.icon}>{icon}</span>}
      </div>
      <span className={cn("text-2xl font-bold nums leading-tight", t.value)}>
        {value}
      </span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
