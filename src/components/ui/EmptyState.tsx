import type { ReactNode } from "react";
import { cn } from "./cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-10 px-4",
        className,
      )}
    >
      {icon && (
        <span className="grid place-items-center h-12 w-12 rounded-full bg-surface-2 text-muted">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && (
          <p className="text-sm text-muted max-w-xs">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
