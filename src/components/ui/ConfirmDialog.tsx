import type { ReactNode } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Oculta el botón de cancelar (para diálogos solo-informativos). */
  hideCancel?: boolean;
  /** Muestra spinner y bloquea los botones mientras se ejecuta la acción. */
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  hideCancel = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      variant="center"
      className="sm:max-w-md"
    >
      {description && <p className="text-sm text-muted">{description}</p>}
      <div className="mt-6 flex justify-end gap-2">
        {!hideCancel && (
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
        )}
        <Button
          variant={danger ? "danger" : "primary"}
          onClick={onConfirm}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
