import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@lib/auth/SessionProvider";
import { useProfile } from "@domains/identity/hooks/useProfile";

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

const ProtectedRoute = ({ requiredRoles }: ProtectedRouteProps) => {
  const { user, loading } = useSession();
  const profileQuery = useProfile();

  if (loading || profileQuery.isLoading) {
    return <div className="text-white/70">Checking permissions…</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    !requiredRoles.includes(profileQuery.data?.role ?? "spectator")
  ) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
