import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

export function useIsAdmin() {
  const { user, loading } = useAuth();
  return { isAdmin: isAdminEmail(user?.email), loading };
}
