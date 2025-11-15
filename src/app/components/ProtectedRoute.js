import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "@lib/auth/SessionProvider";
import { useProfile } from "@domains/identity/hooks/useProfile";
const ProtectedRoute = ({ requiredRoles }) => {
    const { user, loading } = useSession();
    const profileQuery = useProfile();
    if (loading || profileQuery.isLoading) {
        return _jsx("div", { className: "text-white/70", children: "Checking permissions\u2026" });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    if (requiredRoles &&
        requiredRoles.length > 0 &&
        !requiredRoles.includes(profileQuery.data?.role ?? "spectator")) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return _jsx(Outlet, {});
};
export default ProtectedRoute;
