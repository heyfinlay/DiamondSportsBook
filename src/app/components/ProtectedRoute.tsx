import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@lib/auth/SessionProvider";
import { usePermissions } from "@lib/auth/usePermissions";

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

const ProtectedRoute = ({ requiredRoles }: ProtectedRouteProps) => {
  const { user, loading } = useSession();
  const { hasAnyRole, loading: permissionsLoading } = usePermissions();

  if (loading || permissionsLoading) {
    return <div className="text-white/70">Checking permissions…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(...requiredRoles)) {
      // Send authenticated users to a neutral page to avoid login loops when they lack access.
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
