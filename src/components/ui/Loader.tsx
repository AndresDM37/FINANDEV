import { Loader2 } from "lucide-react";
import { cn } from "./cn";

interface LoaderProps {
  className?: string;
  size?: number;
  /** Centra el loader en una zona de página completa. */
  page?: boolean;
  label?: string;
}

export default function Loader({
  className,
  size = 24,
  page = false,
  label,
}: LoaderProps) {
  const spinner = (
    <span className="inline-flex flex-col items-center gap-3 text-muted">
      <Loader2 size={size} className="animate-spin text-accent" />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );

  if (page) {
    return (
      <div
        className={cn(
          "flex min-h-[60vh] w-full items-center justify-center",
          className,
        )}
      >
        {spinner}
      </div>
    );
  }
  return <span className={className}>{spinner}</span>;
}
