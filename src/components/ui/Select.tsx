import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, className, id, children, ...rest },
  ref,
) {
  const field = (
    <div className="relative">
      <select
        ref={ref}
        id={id}
        className={cn(
          "w-full appearance-none bg-surface-2 border border-line text-ink rounded-xl h-11 pl-3.5 pr-9 text-sm outline-none transition-colors focus:border-accent/60 disabled:opacity-50",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
      />
    </div>
  );

  if (!label) return field;
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {field}
    </label>
  );
});

export default Select;
