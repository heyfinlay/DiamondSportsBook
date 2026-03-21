import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
export const AuthCtaBanner = () => {
    const location = useLocation();
    const redirectState = {
        from: {
            pathname: location.pathname,
            search: location.search
        }
    };
    return (_jsxs("div", { className: "prismatic-card flex flex-col gap-4 px-5 py-5 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-headline text-xl font-extrabold uppercase tracking-[0.06em] text-white", children: "Sign in or create an account to place bets." }), _jsx("p", { className: "mt-2 text-xs uppercase tracking-[0.22em] text-on-subtle", children: "Diamond vault access requires a verified profile." })] }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [_jsx(Link, { to: "/login?mode=signin", state: redirectState, className: "prismatic-button prismatic-button-secondary text-center", children: "Sign in" }), _jsx(Link, { to: "/login?mode=signup", state: redirectState, className: "prismatic-button prismatic-button-primary text-center", children: "Sign up" })] })] }));
};
