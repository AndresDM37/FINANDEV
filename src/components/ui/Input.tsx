import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

const FIELD =
  "w-full bg-surface-2 border border-line text-ink placeholder:text-faint rounded-xl outline-none transition-colors focus:border-accent/60 disabled:opacity-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, label, className, id, ...rest },
  ref,
) {
  const field = (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(FIELD, "h-11 text-sm", icon ? "pl-10 pr-3" : "px-3.5", className)}
        {...rest}
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

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, className, id, ...rest }, ref) {
    const field = (
      <textarea
        ref={ref}
        id={id}
        className={cn(FIELD, "px-3.5 py-2.5 text-sm resize-none", className)}
        {...rest}
      />
    );
    if (!label) return field;
    return (
      <label htmlFor={id} className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">{label}</span>
        {field}
      </label>
    );
  },
);

export default Input;
