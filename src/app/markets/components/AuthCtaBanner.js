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
    return (_jsxs("div", { className: "flex flex-col gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 px-4 py-3 text-sm text-white/80 shadow-inner shadow-emerald-500/10 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-base font-semibold text-white", children: "Sign in or create an account to place bets." }), _jsx("p", { className: "text-xs uppercase tracking-[0.35em] text-white/50", children: "DBGP wagering requires a verified profile." })] }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row", children: [_jsx(Link, { to: "/login?mode=signin", state: redirectState, className: "rounded-full border border-white/30 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60", children: "Sign in" }), _jsx(Link, { to: "/login?mode=signup", state: redirectState, className: "rounded-full bg-emerald-400 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-900 transition hover:bg-emerald-300", children: "Sign up" })] })] }));
};
