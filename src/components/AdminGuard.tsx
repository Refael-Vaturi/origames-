import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminGuard() {
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      toast.error("Access Denied — Admins Only");
      navigate("/", { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return null;

  return <Outlet />;
}
