import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './SessionProvider';
import { usePermissions } from './usePermissions';
/**
 * Protected route wrapper that requires authentication and optional role checks
 */
export function ProtectedRoute({ children, requireRole, requireAnyRole, requireAllRoles, }) {
    const { user, loading: authLoading } = useSession();
    const { hasRole, hasAnyRole, hasAllRoles, loading: permissionsLoading } = usePermissions();
    const location = useLocation();
    // Show nothing while loading
    if (authLoading || permissionsLoading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsx("div", { className: "text-white text-lg", children: "Loading..." }) }));
    }
    // Redirect to login if not authenticated
    if (!user) {
        return _jsx(Navigate, { to: "/login", state: { from: location }, replace: true });
    }
    // Check role requirements if specified
    if (requireRole) {
        const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
        if (!roles.some((role) => hasRole(role))) {
            return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-4", children: "Access Denied" }), _jsx("p", { className: "text-slate-400", children: "You don't have permission to access this page." }), _jsxs("p", { className: "text-sm text-slate-500 mt-2", children: ["Required role: ", roles.join(' or ')] })] }) }));
        }
    }
    if (requireAnyRole && !hasAnyRole(...requireAnyRole)) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-4", children: "Access Denied" }), _jsx("p", { className: "text-slate-400", children: "You don't have permission to access this page." }), _jsxs("p", { className: "text-sm text-slate-500 mt-2", children: ["Required role: ", requireAnyRole.join(' or ')] })] }) }));
    }
    if (requireAllRoles && !hasAllRoles(...requireAllRoles)) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-slate-900", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-white mb-4", children: "Access Denied" }), _jsx("p", { className: "text-slate-400", children: "You don't have all required permissions." }), _jsxs("p", { className: "text-sm text-slate-500 mt-2", children: ["Required roles: ", requireAllRoles.join(', ')] })] }) }));
    }
    return _jsx(_Fragment, { children: children });
}
