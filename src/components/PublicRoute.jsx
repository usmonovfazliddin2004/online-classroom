import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function PublicRoute() {
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setChecking(false);
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      setRole(data?.role);
      setChecking(false);
    };

    check();
  }, []);

  if (checking) return null;

  if (role === "teacher") return <Navigate to="/teacher" replace />;
  if (role === "student") return <Navigate to="/student" replace />;

  return <Outlet />;
}
