import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: number;
  min?: number;
  max?: number;
}

export default function Slider({
  value,
  min = 0,
  max = 100,
  className,
  style,
  ...rest
}: SliderProps) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      className={cn("fd-slider w-full", className)}
      style={{
        background: `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-surface-2) ${pct}%)`,
        ...style,
      }}
      {...rest}
    />
  );
}
