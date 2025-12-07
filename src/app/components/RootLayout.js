import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import WalletSummary from "./WalletSummary";
import { cn } from "@lib/utils/cn";
import { useProfile } from "@domains/identity/hooks/useProfile";
import { ToastProvider } from "./ToastProvider";
import { Betslip } from "@domains/betting/components/Betslip";
import CharacterSetupGate from "./CharacterSetupGate";
import { supabase } from "@lib/supabaseClient";
const navItems = [
    { to: "/", label: "Markets" },
    { to: "/wagers", label: "Wagers" },
    { to: "/standings", label: "Standings" },
    { to: "/account", label: "Account" }
];
const RootLayout = () => {
    const profileQuery = useProfile();
    const role = profileQuery.data?.role ?? "spectator";
    const canAdmin = role === "betting_admin" || role === "sportsbook_admin" || role === "super_admin";
    const liveSessionQuery = useQuery({
        queryKey: ["live-session"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("timing_sessions")
                .select("id, is_active")
                .eq("is_active", true)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        }
    });
    const filteredNav = [
        ...navItems,
        ...(canAdmin
            ? [
                { to: "/admin", label: "Admin" },
                { to: "/admin/championship", label: "Championship" },
                { to: "/dashboard/admin/markets", label: "Markets Admin" }
            ]
            : [])
    ];
    const renderLiveNavItem = () => {
        if (liveSessionQuery.isLoading || liveSessionQuery.isError) {
            return (_jsx("span", { className: "rounded-full px-4 py-2 text-white/50", children: "Live" }));
        }
        if (liveSessionQuery.data?.id) {
            return (_jsx(NavLink, { to: `/live/${liveSessionQuery.data.id}`, className: ({ isActive }) => cn("rounded-full px-4 py-2 transition", isActive ? "bg-brand text-black" : "text-white/70 hover:text-white"), children: "Live" }, "live"));
        }
        return (_jsx("span", { className: "rounded-full px-4 py-2 text-white/40 opacity-60", children: "Live" }));
    };
    return (_jsx(ToastProvider, { children: _jsxs("div", { className: "min-h-screen bg-neutral-950 text-white", children: [_jsx("header", { className: "border-b border-white/10 bg-black/60 backdrop-blur", children: _jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [_jsxs("div", { className: "text-lg font-semibold tracking-wide", children: ["DBGP ", _jsx("span", { className: "text-brand", children: "v2" })] }), _jsxs("nav", { className: "flex flex-wrap items-center gap-3 text-sm font-medium", children: [renderLiveNavItem(), filteredNav.map((item) => (_jsx(NavLink, { to: item.to, className: ({ isActive }) => cn("rounded-full px-4 py-2 transition", isActive
                                            ? "bg-brand text-black"
                                            : "text-white/70 hover:text-white"), children: item.label }, item.to)))] }), _jsx(WalletSummary, {})] }) }), _jsx("main", { className: "mx-auto max-w-6xl px-6 py-8", children: _jsx(Outlet, {}) }), _jsx(Betslip, {}), _jsx(CharacterSetupGate, {})] }) }));
};
export default RootLayout;
