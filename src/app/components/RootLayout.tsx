import { useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
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

      if (error) throw error;
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
      return (
        <span className="rounded-xl px-4 py-2 text-white/50">Live</span>
      );
    }

    if (liveSessionQuery.data?.id) {
      return (
        <NavLink
          key="live"
          to={`/live/${liveSessionQuery.data.id}`}
          className={({ isActive }) =>
            cn(
              "rounded-xl px-4 py-2 transition",
              isActive ? "bg-brand text-black" : "text-white/70 hover:text-white"
            )
          }
        >
          Live
        </NavLink>
      );
    }

    return (
      <span className="rounded-xl px-4 py-2 text-white/40 opacity-60">Live</span>
    );
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="flex">
          <aside className="hidden min-h-screen w-64 flex-col border-r border-white/10 bg-black/70 px-5 py-6 lg:flex">
            <div className="text-lg font-semibold tracking-wide">
              DBGP <span className="text-brand">v2</span>
            </div>
            <div className="mt-6 flex flex-col gap-2 text-sm font-medium">
              {renderLiveNavItem()}
              {filteredNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-4 py-2 transition",
                      isActive
                        ? "bg-brand text-black"
                        : "text-white/70 hover:text-white"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </aside>

          <div className="flex-1">
            <header className="flex items-center justify-between border-b border-white/10 bg-black/60 px-6 py-4 backdrop-blur">
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                Menu
              </button>
              <div className="text-sm font-semibold tracking-wide">
                DBGP <span className="text-brand">v2</span>
              </div>
              <div className="hidden lg:block">
                <WalletSummary />
              </div>
              <div className="lg:hidden">
                <WalletSummary />
              </div>
            </header>

            {mobileOpen && (
              <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} />
            )}
            <div
              className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/10 bg-black/90 px-5 py-6 transition lg:hidden ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold tracking-wide">
                  DBGP <span className="text-brand">v2</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-white/10 px-2 py-1 text-xs"
                >
                  Close
                </button>
              </div>
              <div className="mt-6 flex flex-col gap-2 text-sm font-medium">
                {renderLiveNavItem()}
                {filteredNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-xl px-4 py-2 transition",
                        isActive
                          ? "bg-brand text-black"
                          : "text-white/70 hover:text-white"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <div className="mt-6">
                <WalletSummary />
              </div>
            </div>

            <main className="mx-auto max-w-6xl px-6 py-8">
              <Outlet />
            </main>
          </div>
        </div>
        <Betslip />
        <CharacterSetupGate />
      </div>
    </ToastProvider>
  );
};

export default RootLayout;
