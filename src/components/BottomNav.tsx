import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  DollarSign,
  CreditCard,
  PiggyBank,
  PieChart,
  Mail,
  Settings,
} from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/incomes", label: "Ingresos", icon: DollarSign },
  { to: "/expenses", label: "Gastos", icon: CreditCard },
  { to: "/savings", label: "Ahorros", icon: PiggyBank },
  { to: "/analytics", label: "Análisis", icon: PieChart },
  { to: "/imported", label: "Correos", icon: Mail },
  { to: "/admin", label: "Config", icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav print:hidden">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav__link ${isActive ? "bottom-nav__link--active" : ""}`
          }
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
