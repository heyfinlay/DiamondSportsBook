interface ProtectedRouteProps {
    children: React.ReactNode;
    requireRole?: string | string[];
    requireAnyRole?: string[];
    requireAllRoles?: string[];
}
/**
 * Protected route wrapper that requires authentication and optional role checks
 */
export declare function ProtectedRoute({ children, requireRole, requireAnyRole, requireAllRoles, }: ProtectedRouteProps): import("react/jsx-runtime").JSX.Element;
export {};
