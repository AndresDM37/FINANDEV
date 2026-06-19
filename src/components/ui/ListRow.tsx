import type { ReactNode } from "react";
import { cn } from "./cn";

interface ListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Valor a la derecha (p. ej. un monto). */
  value?: ReactNode;
  /** Acciones a la derecha del valor (editar / borrar). */
  actions?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function ListRow({
  icon,
  title,
  subtitle,
  value,
  actions,
  onClick,
  className,
}: ListRowProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        "flex items-center gap-3 py-3",
        interactive && "cursor-pointer hover:bg-surface-2/40 rounded-xl -mx-2 px-2 transition-colors",
        className,
      )}
    >
      {icon && (
        <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-surface-2 text-muted">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted truncate">{subtitle}</p>
        )}
      </div>
      {value !== undefined && (
        <span className="text-sm font-semibold nums shrink-0">{value}</span>
      )}
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  );
}
