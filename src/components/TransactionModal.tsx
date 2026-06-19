import React, { useEffect, useState } from "react";
import { X, AlignLeft, Calendar, Wallet, Check, Coins } from "lucide-react";
import { EXPENSE_CATEGORIES } from "../utils/categories";
import type { ExpenseCategory } from "../types/finance.types";
import { Button, SegmentedControl, Switch, cn } from "./ui";

export interface TransactionFormData {
  name: string;
  amount: number;
  type: "expense" | "income";
  category: ExpenseCategory;
  wallet: string;
  isSmallExpense: boolean;
  date: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => void;
}

const WALLETS = ["Bancolombia", "Nu", "Nequi"];
const CURRENCIES = ["COP", "USD", "EUR"];

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
}: TransactionModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<ExpenseCategory>("food");
  const [wallet, setWallet] = useState("Bancolombia");
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [isSmallExpense, setIsSmallExpense] = useState(false);
  const [currency, setCurrency] = useState("COP");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const today = new Date();
  const dateString = `Hoy, ${today
    .toLocaleString("es-ES", { month: "short" })
    .replace(".", "")} ${today.getDate()}`;

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (currency === "COP") {
      const rawDigits = value.replace(/\D/g, "");
      if (!rawDigits) {
        setAmount("");
        return;
      }
      setAmount(rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, "."));
    } else {
      value = value.replace(/[^0-9.]/g, "");
      const parts = value.split(".");
      if (parts.length > 2) return;
      if (parts[1]?.length > 2) return;
      setAmount(value);
    }
  };

  const handleSave = () => {
    const rawAmount = currency === "COP" ? amount.replace(/\./g, "") : amount;
    const parsedAmount = parseFloat(rawAmount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) return;
    onSubmit({
      name: description || (categoryId === "food" ? "Comida" : "Transacción"),
      amount: parsedAmount,
      type,
      category: categoryId,
      wallet,
      isSmallExpense,
      date: new Date().toISOString(),
    });
  };

  const disabled = !amount || parseFloat(amount.replace(/\./g, "")) <= 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="w-8" />
          <h2 className="text-base font-semibold">Nueva transacción</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 space-y-7 overflow-y-auto no-scrollbar px-5 py-5">
          <SegmentedControl<"expense" | "income">
            value={type}
            onChange={setType}
            segments={[
              { value: "expense", label: "Gasto" },
              { value: "income", label: "Ingreso" },
            ]}
            className="mx-auto max-w-xs"
          />

          {/* Monto */}
          <div className="flex flex-col items-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-faint">
              Monto
            </p>
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="mt-1 text-3xl font-light text-faint">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder={currency === "COP" ? "0" : "0.00"}
                value={amount}
                onChange={handleAmountChange}
                className="w-auto max-w-[200px] bg-transparent text-center text-5xl font-semibold nums text-ink placeholder:text-faint/40 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Moneda */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                {currency} <span className="ml-1 text-[10px] opacity-70">▼</span>
              </button>
              {showCurrencyDropdown && (
                <div className="absolute left-1/2 top-full z-10 mt-2 min-w-20 -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface-2 py-1 shadow-xl">
                  {CURRENCIES.map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => {
                        if (cur !== currency) setAmount("");
                        setCurrency(cur);
                        setShowCurrencyDropdown(false);
                      }}
                      className={cn(
                        "block w-full px-4 py-2 text-left text-xs font-medium transition-colors",
                        currency === cur
                          ? "bg-accent-soft text-accent-bright"
                          : "text-muted hover:bg-surface hover:text-ink",
                      )}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Categoría */}
          {type === "expense" && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted">Categoría</h3>
              <div className="flex items-start gap-4 overflow-x-auto no-scrollbar pb-2">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  const active = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className="flex min-w-16 flex-col items-center gap-2"
                    >
                      <span
                        className={cn(
                          "grid h-14 w-14 place-items-center rounded-full transition-colors",
                          active
                            ? "bg-accent text-ground"
                            : "border border-line bg-surface-2 text-muted hover:text-ink",
                        )}
                      >
                        <CatIcon size={20} />
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          active ? "text-ink" : "text-muted",
                        )}
                      >
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-4 focus-within:border-accent/60 transition-colors">
            <AlignLeft size={18} className="shrink-0 text-faint" />
            <input
              type="text"
              placeholder="¿Para qué es esto?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-ink placeholder:text-faint focus:outline-none"
            />
          </div>

          {/* Fecha + billetera */}
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col rounded-2xl border border-line bg-surface-2 p-4">
              <div className="mb-1.5 flex items-center gap-2 text-muted">
                <Calendar size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Fecha
                </span>
              </div>
              <p className="truncate text-sm font-semibold">{dateString}</p>
            </div>

            <div className="relative flex flex-1 flex-col rounded-2xl border border-line bg-surface-2 p-4">
              <div className="mb-1.5 flex items-center gap-2 text-muted">
                <Wallet size={14} />
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  Billetera
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowWalletDropdown((v) => !v)}
                className="flex w-full items-center justify-between focus:outline-none"
              >
                <span className="truncate text-sm font-semibold">{wallet}</span>
                <span className="ml-2 text-[10px] opacity-60">▼</span>
              </button>
              {showWalletDropdown && (
                <div className="absolute left-0 top-[85%] z-10 w-full overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
                  {WALLETS.map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => {
                        setWallet(bank);
                        setShowWalletDropdown(false);
                      }}
                      className={cn(
                        "block w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
                        wallet === bank
                          ? "bg-accent-soft text-accent-bright"
                          : "text-muted hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gasto hormiga */}
          {type === "expense" && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted">
                  <Coins size={14} />
                </span>
                <div>
                  <p className="text-sm font-semibold">Gasto menor</p>
                  <p className="text-xs text-muted">Marcar como “gasto hormiga”</p>
                </div>
              </div>
              <Switch checked={isSmallExpense} onChange={setIsSmallExpense} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={handleSave}
            disabled={disabled}
            fullWidth
            size="lg"
            icon={<Check size={18} strokeWidth={3} />}
          >
            Guardar transacción
          </Button>
        </div>
      </div>
    </div>
  );
}
