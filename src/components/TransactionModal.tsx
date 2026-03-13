import React, { useState } from "react";
import {
  X,
  Utensils,
  Car,
  ShoppingBag,
  Smile,
  Plane,
  AlignLeft,
  Calendar,
  Wallet,
  Check,
  Coins,
} from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
}: TransactionModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("food");
  const [wallet, setWallet] = useState("Bancolombia");
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [isSmallExpense, setIsSmallExpense] = useState(false);
  const [currency, setCurrency] = useState("COP");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  // Formatted date string for inputs
  const today = new Date();
  const dateString = `Hoy, ${today.toLocaleString("es-ES", { month: "short" }).replace(".", "")} ${today.getDate()}`;

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    if (currency === "COP") {
      const rawDigits = value.replace(/\D/g, "");
      if (!rawDigits) {
        setAmount("");
        return;
      }
      const formatted = rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      setAmount(formatted);
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
      type: type,
      category: categoryId,
      wallet: wallet,
      isSmallExpense: isSmallExpense,
      date: new Date().toISOString(),
    });
  };

  const categories = [
    { id: "food", icon: <Utensils size={20} />, label: "Comida" },
    { id: "transport", icon: <Car size={20} />, label: "Transp." },
    { id: "shopping", icon: <ShoppingBag size={20} />, label: "Compras" },
    { id: "fun", icon: <Smile size={20} />, label: "Ocio" },
    { id: "travel", icon: <Plane size={20} />, label: "Viajes" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0a0f18]/80 backdrop-blur-sm sm:items-center">
      {/* Modal Container */}
      <div className="w-full max-w-2xl bg-[#0e1628] rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#1e293b]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-2">
          <div className="w-8" /> {/* Spacer for centering */}
          <h2 className="text-slate-200 font-semibold text-[15px]">
            Nueva Transacción
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} className="opacity-80" />
          </button>
        </div>

        {/* Scrollable Content Range */}
        <div className="overflow-y-auto px-6 pb-6 pt-2 flex-1 scrollbar-hide">
          {/* Segmented Control: Expense / Income */}
          <div className="bg-[#141b2e] rounded-full p-1.5 flex items-center mb-8 mx-auto w-72 border border-[#1e293b] shadow-inner">
            <button
              onClick={() => setType("expense")}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-full text-center transition-all ${
                type === "expense"
                  ? "bg-red-950/40 text-rose-200 border border-red-900/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Gasto
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-full text-center transition-all ${
                type === "income"
                  ? "bg-[#1e293b] text-slate-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Ingreso
            </button>
          </div>

          {/* Amount Input area */}
          <div className="text-center mb-8 flex flex-col items-center">
            <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-1">
              Monto
            </p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-3xl text-slate-500 font-light mt-1">$</span>
              <input
                type="text"
                placeholder={currency === "COP" ? "0" : "0.00"}
                value={amount}
                onChange={handleAmountChange}
                className="bg-transparent text-5xl font-semibold text-slate-200 w-auto max-w-[200px] text-center focus:outline-none placeholder-slate-700"
                autoFocus
              />
            </div>

            {/* Currency Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="bg-[#141b2e] hover:bg-[#1a2536] border border-[#1e293b] rounded-full px-3 py-1 text-xs font-semibold text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {currency} <span className="text-[10px] ml-1 opacity-70">▼</span>
              </button>
              
              {/* Dropdown */}
              {showCurrencyDropdown && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#141b2e] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden py-1 z-50 min-w-[80px]">
                  {["COP", "USD", "EUR"].map((cur) => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => {
                        if (cur !== currency) setAmount("");
                        setCurrency(cur);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                        currency === cur 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : "text-slate-300 hover:bg-[#1a2536]"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Scroller */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] font-medium text-slate-300">
                Categoría
              </h3>
              <button className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                Editar
              </button>
            </div>

            <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className="flex flex-col items-center gap-2 min-w-[64px]"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-sm mb-1 ${
                      categoryId === cat.id
                        ? "bg-emerald-500 text-[#0e1628]"
                        : "bg-[#141b2e] text-slate-400 border border-[#1e293b] hover:bg-[#1a2536]"
                    }`}
                  >
                    {cat.icon}
                  </div>
                  <span
                    className={`text-[11px] font-semibold ${
                      categoryId === cat.id
                        ? "text-slate-100"
                        : "text-slate-400"
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes description input */}
          <div className="mb-4">
            <div className="bg-[#141b2e] focus-within:bg-[#1a2536] border border-[#1e293b] focus-within:border-emerald-500/50 rounded-[20px] flex items-center p-4 transition-colors">
              <AlignLeft size={18} className="text-slate-500 mr-3 shrink-0" />
              <input
                type="text"
                placeholder="¿Para qué es esto?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-transparent text-sm w-full text-slate-200 font-medium placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Date & Wallet Split Row */}
          <div className="flex gap-4 mb-4">
            {/* Date Field */}
            <div className="flex-1 bg-[#141b2e] hover:bg-[#1a2536] border border-[#1e293b] rounded-[20px] p-4 cursor-pointer transition-colors flex flex-col">
              <div className="flex items-center gap-2 mb-1.5 opacity-60">
                <Calendar size={14} className="text-slate-300" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  Fecha
                </span>
              </div>
              <p className="text-[15px] font-semibold text-slate-200 truncate">
                {dateString}
              </p>
            </div>

            {/* Wallet Field */}
            <div className="flex-1 bg-[#141b2e] hover:bg-[#1a2536] border border-[#1e293b] rounded-[20px] p-4 transition-colors relative flex flex-col">
              <div className="flex items-center gap-2 mb-1.5 opacity-60">
                <Wallet size={14} className="text-slate-300" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                  Billetera
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className="w-full flex justify-between items-center text-slate-200 focus:outline-none"
              >
                <p className="text-[15px] font-semibold truncate">{wallet}</p>
                <span className="text-[10px] opacity-60 ml-2">▼</span>
              </button>

               {/* Dropdown */}
               {showWalletDropdown && (
                <div className="absolute top-[85%] left-0 w-full bg-[#141b2e] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden py-1 z-50">
                  {["Bancolombia", "Nu", "Nequi"].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => {
                        setWallet(bank);
                        setShowWalletDropdown(false);
                      }}
                      className={`block w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                        wallet === bank 
                          ? "bg-emerald-500/10 text-emerald-500" 
                          : "text-slate-300 hover:bg-[#1a2536]"
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Small Expense / Hormiga Toggle */}
          <div className="bg-[#141b2e] border border-[#1e293b] rounded-[20px] p-4 flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400">
                <Coins size={14} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">Gasto Menor</p>
                <p className="text-[11px] text-slate-400">
                  Marcar como "Gasto Hormiga"
                </p>
              </div>
            </div>

            {/* Custom Toggle Switch */}
            <button
              type="button"
              onClick={() => setIsSmallExpense(!isSmallExpense)}
              className={`w-11 h-6 rounded-full p-1 transition-colors relative flex items-center ${
                isSmallExpense ? "bg-slate-200" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-slate-400 shadow-sm transform transition-transform ${
                  isSmallExpense
                    ? "translate-x-5 !bg-[#0e1628]"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pb-8 pt-4 px-6 bg-[#0e1628]">
          <button
            onClick={handleSave}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-[#0e1628] font-bold text-[15px] py-4 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            Guardar Transacción <Check size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
