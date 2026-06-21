import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Input } from "./Input";
import { formatThousands } from "../../utils/calculations";

interface AmountInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  icon?: ReactNode;
  label?: string;
  /** Dígitos crudos sin puntos, p. ej. "150000". */
  value: string;
  /** Devuelve los dígitos crudos sin puntos. */
  onChange: (raw: string) => void;
}

/**
 * Input de monto en pesos: muestra el valor agrupado con puntos de miles
 * ("1.000.000") mientras se escribe, pero entrega dígitos crudos por onChange
 * para que el formulario siga guardando con parseFloat sin cambios.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  function AmountInput({ value, onChange, ...rest }, ref) {
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={formatThousands(value)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        {...rest}
      />
    );
  },
);

export default AmountInput;
