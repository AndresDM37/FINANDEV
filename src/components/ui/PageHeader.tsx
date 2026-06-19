import type { ReactNode } from "react";
import { cn } from "./cn";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 mb-6",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <span className="grid place-items-center h-11 w-11 shrink-0 rounded-xl bg-accent-soft text-accent">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-ink truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
