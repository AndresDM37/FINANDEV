import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "default" | "raised" | "accent";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  padded?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  default: "bg-surface border border-line",
  raised: "bg-surface-2 border border-line-strong",
  accent: "bg-accent-soft border border-accent/20",
};

export default function Card({
  variant = "default",
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        VARIANTS[variant],
        padded && "p-4 sm:p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
