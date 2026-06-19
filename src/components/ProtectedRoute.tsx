import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Loader from "./ui/Loader";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen bg-ground">
        <Loader page label="Cargando…" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
