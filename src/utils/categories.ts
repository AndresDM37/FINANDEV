import {
  Utensils,
  Car,
  ShoppingBag,
  Smile,
  Plane,
  Coins,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "../types/finance.types";

export interface CategoryDef {
  id: ExpenseCategory;
  label: string;
  icon: LucideIcon;
}

/** Categorías de gasto compartidas entre modal, listas y dashboard. */
export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { id: "food", label: "Comida", icon: Utensils },
  { id: "transport", label: "Transp.", icon: Car },
  { id: "shopping", label: "Compras", icon: ShoppingBag },
  { id: "fun", label: "Ocio", icon: Smile },
  { id: "travel", label: "Viajes", icon: Plane },
  { id: "other", label: "Otros", icon: Coins },
];

export function getCategoryDef(id: string | null | undefined): CategoryDef {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === id) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}
