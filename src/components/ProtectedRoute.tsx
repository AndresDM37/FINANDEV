import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-loader">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
