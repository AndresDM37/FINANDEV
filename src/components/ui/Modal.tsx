import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** "sheet" sube desde abajo en móvil; "center" centrado en todas. */
  variant?: "sheet" | "center";
  className?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  variant = "sheet",
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelPosition =
    variant === "sheet"
      ? "absolute inset-x-0 bottom-0 rounded-t-3xl sm:static sm:rounded-3xl sm:my-auto sm:w-full sm:max-w-lg"
      : "w-full max-w-lg rounded-3xl my-auto";

  return (
    <div
      className="fixed inset-0 z-[100] flex sm:items-center sm:justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "bg-surface border border-line shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar",
          panelPosition,
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-surface/95 backdrop-blur px-5 py-4 border-b border-line">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
