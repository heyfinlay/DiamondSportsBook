import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Bell, CircleUserRound, Command, Crosshair, Gauge, HelpCircle, Search, Settings, ShieldCheck, Trophy, Wallet2, X, Menu, CircleDot } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@lib/supabaseClient";
import { cn } from "@lib/utils/cn";
import { useProfile } from "@domains/identity/hooks/useProfile";
import { Betslip } from "@domains/betting/components/Betslip";
import CharacterSetupGate from "./CharacterSetupGate";
import WalletSummary from "./WalletSummary";
import { ToastProvider } from "./ToastProvider";
const navItems = [
    { to: "/", label: "Live" },
    { to: "/active-markets", label: "Markets" },
    { to: "/standings", label: "Results" },
    { to: "/wagers", label: "History" },
    { to: "/account", label: "Vault" }
];
const sportRailItems = [
    { key: "f1", label: "F1 Racing", icon: Gauge },
    { key: "nrl", label: "NRL", icon: Trophy },
    { key: "afl", label: "AFL", icon: ShieldCheck },
    { key: "mma", label: "MMA", icon: Crosshair },
    { key: "soccer", label: "Soccer", icon: CircleDot }
];
const navLinkClass = ({ isActive }) => cn("inline-flex items-center border-b-2 px-1 pb-1 font-headline text-[0.78rem] font-bold uppercase tracking-[0.12em] transition-colors", isActive
    ? "border-primary-container text-primary-container"
    : "border-transparent text-on-subtle hover:text-white");
const RootLayout = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const profileQuery = useProfile();
    const role = profileQuery.data?.role ?? "spectator";
    const canAdmin = role === "betting_admin" || role === "sportsbook_admin" || role === "super_admin";
    const liveSessionQuery = useQuery({
        queryKey: ["live-session-shell"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("timing_sessions")
                .select("id, name, track_name")
                .eq("is_active", true)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        }
    });
    const primaryTicker = useMemo(() => {
        if (liveSessionQuery.data?.track_name) {
            return `Live telemetry online • ${liveSessionQuery.data.track_name}`;
        }
        return "External sports sync standby";
    }, [liveSessionQuery.data]);
    const filteredNav = [
        ...navItems,
        ...(canAdmin ? [{ to: "/admin", label: "Ops" }] : [])
    ];
    return (_jsx(ToastProvider, { children: _jsxs("div", { className: "min-h-screen bg-background text-on-surface prismatic-grid", children: [_jsx("div", { className: "fixed inset-x-0 top-0 z-50 border-b border-outline-variant/15 bg-surface-lowest/95 backdrop-blur-xl", children: _jsxs("div", { className: "flex h-8 items-center justify-between px-4 text-[0.62rem] uppercase tracking-[0.2em] text-on-subtle sm:px-6 lg:px-8", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "inline-flex h-1.5 w-1.5 bg-primary-container" }), _jsx("span", { children: primaryTicker })] }), _jsx("div", { className: "hidden items-center gap-3 lg:flex", children: _jsx("span", { className: "text-primary-fixed", children: "Sports Intelligence Framework" }) })] }) }), _jsx("header", { className: "fixed inset-x-0 top-8 z-50 border-b border-outline-variant/15 bg-surface-lowest/92 backdrop-blur-xl", children: _jsxs("div", { className: "flex h-16 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-4 lg:gap-8", children: [_jsx("button", { type: "button", className: "inline-flex h-10 w-10 items-center justify-center border border-outline-variant/15 bg-surface-low text-on-surface lg:hidden", onClick: () => setMobileOpen(true), "aria-label": "Open navigation", children: _jsx(Menu, { className: "h-5 w-5" }) }), _jsxs(NavLink, { to: "/", className: "flex items-center gap-3 text-white", children: [_jsx(Command, { className: "h-5 w-5 text-primary-container" }), _jsx("span", { className: "font-headline text-xl font-extrabold uppercase tracking-[0.08em]", children: "Diamond" })] }), _jsx("nav", { className: "hidden items-center gap-6 lg:flex", children: filteredNav.map((item) => (_jsx(NavLink, { to: item.to, className: navLinkClass, children: item.label }, item.to))) })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "hidden items-center gap-2 border border-outline-variant/15 bg-surface-high px-3 py-2 text-on-subtle lg:flex", children: [_jsx(Search, { className: "h-4 w-4" }), _jsx("span", { className: "text-xs", children: "Search markets, events, users..." })] }), _jsx("div", { className: "hidden min-w-[220px] xl:block", children: _jsx(WalletSummary, {}) }), _jsx(NavLink, { to: "/account", className: "prismatic-button prismatic-button-primary min-h-[2.35rem] px-5 text-[0.64rem]", children: "Deposit" }), _jsx("button", { type: "button", className: "hidden h-10 w-10 items-center justify-center text-on-subtle transition hover:text-white sm:inline-flex", children: _jsx(Bell, { className: "h-4 w-4" }) }), _jsx(NavLink, { to: "/account", className: "inline-flex h-10 w-10 items-center justify-center border border-outline-variant/15 bg-surface-low text-on-surface transition hover:border-primary-container/35 hover:text-primary-container", "aria-label": "Open account", children: _jsx(CircleUserRound, { className: "h-5 w-5" }) })] })] }) }), mobileOpen ? (_jsx("button", { type: "button", className: "fixed inset-0 z-50 bg-black/70 lg:hidden", onClick: () => setMobileOpen(false), "aria-label": "Close navigation overlay" })) : null, _jsxs("aside", { className: "fixed inset-y-0 left-0 top-24 z-40 hidden w-64 border-r border-outline-variant/15 bg-surface/92 px-4 py-6 backdrop-blur-xl md:flex md:flex-col", children: [_jsxs("div", { className: "px-2", children: [_jsx("p", { className: "font-headline text-lg font-bold text-white", children: "Intelligence" }), _jsx("p", { className: "mt-1 text-[0.58rem] uppercase tracking-[0.22em] text-on-subtle", children: "Live Tactical Feed" })] }), _jsxs("nav", { className: "mt-8 flex flex-1 flex-col gap-1", children: [sportRailItems.map((item, index) => {
                                    const Icon = item.icon;
                                    const isDefault = index === 0;
                                    return (_jsxs("button", { type: "button", className: cn("flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors", isDefault
                                            ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container"
                                            : "text-on-subtle hover:bg-surface-low hover:text-white"), children: [_jsx(Icon, { className: "h-4 w-4" }), _jsx("span", { children: item.label })] }, item.key));
                                }), canAdmin ? (_jsxs(NavLink, { to: "/admin", className: ({ isActive }) => cn("mt-4 flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors", isActive
                                        ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container"
                                        : "text-on-subtle hover:bg-surface-low hover:text-white"), children: [_jsx(ShieldCheck, { className: "h-4 w-4" }), _jsx("span", { children: "Operations" })] })) : null] }), _jsxs("div", { className: "border-t border-outline-variant/15 pt-4", children: [_jsxs("button", { type: "button", className: "flex w-full items-center gap-3 px-4 py-3 text-sm text-on-subtle transition hover:bg-surface-low hover:text-white", children: [_jsx(Settings, { className: "h-4 w-4" }), _jsx("span", { children: "Settings" })] }), _jsxs("button", { type: "button", className: "flex w-full items-center gap-3 px-4 py-3 text-sm text-on-subtle transition hover:bg-surface-low hover:text-white", children: [_jsx(HelpCircle, { className: "h-4 w-4" }), _jsx("span", { children: "Support" })] })] })] }), _jsxs("aside", { className: cn("fixed inset-y-0 left-0 top-0 z-[60] w-[18rem] border-r border-outline-variant/15 bg-surface-lowest/96 px-5 py-5 backdrop-blur-2xl transition-transform lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full"), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-outline-variant/15 pb-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-headline text-lg font-extrabold uppercase tracking-[0.12em] text-white", children: "Diamond" }), _jsx("p", { className: "text-[0.58rem] uppercase tracking-[0.22em] text-on-subtle", children: "Sports Intelligence" })] }), _jsx("button", { type: "button", className: "inline-flex h-10 w-10 items-center justify-center border border-outline-variant/15 bg-surface-low text-on-surface", onClick: () => setMobileOpen(false), "aria-label": "Close navigation", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsx("div", { className: "mt-6", children: _jsx(WalletSummary, {}) }), _jsx("nav", { className: "mt-6 flex flex-col gap-2", children: filteredNav.map((item) => (_jsx(NavLink, { to: item.to, onClick: () => setMobileOpen(false), className: ({ isActive }) => cn("flex min-h-[3rem] items-center px-4 font-headline text-xs font-bold uppercase tracking-[0.18em] transition", isActive
                                    ? "bg-primary-container/10 text-primary-container"
                                    : "text-on-subtle hover:bg-surface-low hover:text-white"), children: item.label }, item.to))) })] }), _jsxs("div", { className: "relative z-10 min-h-screen pt-24 md:ml-64", children: [_jsxs("main", { className: "px-4 pb-12 pt-8 sm:px-6 lg:px-8", children: [_jsx("div", { className: "xl:hidden", children: _jsx("div", { className: "mb-6", children: _jsx(WalletSummary, {}) }) }), _jsx(Outlet, {})] }), _jsx("footer", { className: "border-t border-outline-variant/15 bg-surface-lowest/88 backdrop-blur-xl", children: _jsxs("div", { className: "flex flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8", children: [_jsxs("div", { children: [_jsx("p", { className: "font-headline text-2xl font-extrabold uppercase tracking-[0.12em] text-white", children: "Diamond Sportsbook" }), _jsx("p", { className: "mt-3 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle", children: "Multi-sport parimutuel intelligence with realtime event routing." })] }), _jsx("div", { className: "flex flex-col gap-3 lg:items-end", children: _jsxs("div", { className: "flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle", children: [_jsx(Wallet2, { className: "h-3.5 w-3.5 text-primary-container" }), _jsx("span", { children: "Wallet ledger secured" })] }) })] }) })] }), _jsx(Betslip, {}), _jsx(CharacterSetupGate, {})] }) }));
};
export default RootLayout;
