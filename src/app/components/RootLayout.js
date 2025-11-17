import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink } from "react-router-dom";
import WalletSummary from "./WalletSummary";
import { cn } from "@lib/utils/cn";
import { useProfile } from "@domains/identity/hooks/useProfile";
import { ToastProvider } from "./ToastProvider";
import { Betslip } from "@domains/betting/components/Betslip";
const navItems = [
    { to: "/", label: "Markets" },
    { to: "/live/demo", label: "Live Timing" },
    { to: "/account", label: "Account" }
];
const RootLayout = () => {
    const profileQuery = useProfile();
    const role = profileQuery.data?.role ?? "spectator";
    const canControl = role === "race_control" || role === "super_admin";
    const canAdmin = role === "betting_admin" || role === "super_admin";
    const filteredNav = [
        ...navItems,
        ...(canControl ? [{ to: "/control/demo", label: "Race Control" }] : []),
        ...(canAdmin ? [{ to: "/admin", label: "Admin" }] : [])
    ];
    return (_jsx(ToastProvider, { children: _jsxs("div", { className: "min-h-screen bg-neutral-950 text-white", children: [_jsx("header", { className: "border-b border-white/10 bg-black/60 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [_jsxs("div", { className: "text-lg font-semibold tracking-wide", children: ["DBGP ", _jsx("span", { className: "text-brand", children: "v2" })] }), _jsx("nav", { className: "flex flex-wrap items-center gap-3 text-sm font-medium", children: filteredNav.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => cn("rounded-full px-4 py-2 transition", isActive
                                        ? "bg-brand text-black"
                                        : "text-white/70 hover:text-white"), children: item.label }, item.to))) }), _jsx(WalletSummary, {})] }) }), _jsx("main", { className: "mx-auto max-w-6xl px-6 py-8", children: _jsx(Outlet, {}) }), _jsx(Betslip, {})] }) }));
};
export default RootLayout;
