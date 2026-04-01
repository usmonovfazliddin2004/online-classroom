import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function ProtectedRoute({ allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      setUserRole(data?.role);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) return null;

  if (!userRole) return <Navigate to="/login" replace />;

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
