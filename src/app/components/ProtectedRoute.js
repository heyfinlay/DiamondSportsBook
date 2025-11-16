import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@lib/auth/SessionProvider";
import { usePermissions } from "@lib/auth/usePermissions";
const ProtectedRoute = ({ requiredRoles }) => {
    const { user, loading } = useSession();
    const { hasAnyRole, loading: permissionsLoading } = usePermissions();
    if (loading || permissionsLoading) {
        return _jsx("div", { className: "text-white/70", children: "Checking permissions\u2026" });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (requiredRoles && requiredRoles.length > 0) {
        if (!hasAnyRole(...requiredRoles)) {
            return _jsx(Navigate, { to: "/login", replace: true });
        }
    }
    return _jsx(Outlet, {});
};
export default ProtectedRoute;
