import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ admin = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-on-surface-variant font-body-md">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "chairperson") return <Navigate to="/app" replace />;
  return <Outlet />;
}