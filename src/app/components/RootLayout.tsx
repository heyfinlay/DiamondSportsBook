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
  { key: "f1", label: "F1 Racing", icon: Gauge, to: "/sports/f1" },
  { key: "nrl", label: "NRL", icon: Trophy, to: "/sports/nrl" },
  { key: "afl", label: "AFL", icon: ShieldCheck, to: "/sports/afl" },
  { key: "mma", label: "MMA", icon: Crosshair, to: "/sports/mma" },
  { key: "soccer", label: "Soccer", icon: CircleDot, to: "/sports/soccer" }
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex items-center border-b-2 px-1 pb-1 font-headline text-[0.78rem] font-bold uppercase tracking-[0.12em] transition-colors",
    isActive
      ? "border-primary-container text-primary-container"
      : "border-transparent text-on-subtle hover:text-white"
  );

const RootLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileQuery = useProfile();
  const role = profileQuery.data?.role ?? "spectator";
  const permissions = profileQuery.data?.permissions ?? [];
  const canAdmin =
    role === "betting_admin" ||
    role === "sportsbook_admin" ||
    role === "super_admin" ||
    permissions.includes("betting_admin") ||
    permissions.includes("sportsbook_admin");

  const liveSessionQuery = useQuery({
    queryKey: ["live-session-shell"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timing_sessions")
        .select("id, name, track_name")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
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

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-on-surface prismatic-grid">
        <div className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/15 bg-surface-lowest/95 backdrop-blur-xl">
          <div className="flex h-8 items-center justify-between px-4 text-[0.62rem] uppercase tracking-[0.2em] text-on-subtle sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-1.5 w-1.5 bg-primary-container" />
              <span>{primaryTicker}</span>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <span className="text-primary-fixed">Sports Intelligence Framework</span>
            </div>
          </div>
        </div>

        <header className="fixed inset-x-0 top-8 z-50 border-b border-outline-variant/15 bg-surface-lowest/92 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4 lg:gap-8">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center border border-outline-variant/15 bg-surface-low text-on-surface lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <NavLink to="/" className="flex items-center gap-3 text-white">
                <Command className="h-5 w-5 text-primary-container" />
                <span className="font-headline text-xl font-extrabold uppercase tracking-[0.08em]">
                  Diamond
                </span>
              </NavLink>

              <nav className="hidden items-center gap-6 lg:flex">
                {filteredNav.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 border border-outline-variant/15 bg-surface-high px-3 py-2 text-on-subtle lg:flex">
                <Search className="h-4 w-4" />
                <span className="text-xs">Search markets, events, users...</span>
              </div>
              <div className="hidden min-w-[220px] xl:block">
                <WalletSummary />
              </div>
              <NavLink
                to="/account"
                className="prismatic-button prismatic-button-primary min-h-[2.35rem] px-5 text-[0.64rem]"
              >
                Deposit
              </NavLink>
              <button type="button" className="hidden h-10 w-10 items-center justify-center text-on-subtle transition hover:text-white sm:inline-flex">
                <Bell className="h-4 w-4" />
              </button>
              <NavLink
                to="/account"
                className="inline-flex h-10 w-10 items-center justify-center border border-outline-variant/15 bg-surface-low text-on-surface transition hover:border-primary-container/35 hover:text-primary-container"
                aria-label="Open account"
              >
                <CircleUserRound className="h-5 w-5" />
              </NavLink>
            </div>
          </div>
        </header>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/70 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
        ) : null}

        <aside className="fixed inset-y-0 left-0 top-24 z-40 hidden w-64 border-r border-outline-variant/15 bg-surface/92 px-4 py-6 backdrop-blur-xl md:flex md:flex-col">
          <div className="px-2">
            <p className="font-headline text-lg font-bold text-white">Intelligence</p>
            <p className="mt-1 text-[0.58rem] uppercase tracking-[0.22em] text-on-subtle">
              Live Tactical Feed
            </p>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {sportRailItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container"
                        : "text-on-subtle hover:bg-surface-low hover:text-white"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {canAdmin ? (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      "mt-4 flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container"
                        : "text-on-subtle hover:bg-surface-low hover:text-white"
                    )
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Operations</span>
                </NavLink>
                <NavLink
                  to="/admin/sports"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container"
                        : "text-on-subtle hover:bg-surface-low hover:text-white"
                    )
                  }
                >
                  <Gauge className="h-4 w-4" />
                  <span>Market Review</span>
                </NavLink>
                <NavLink
                  to="/admin/wallets"
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container"
                        : "text-on-subtle hover:bg-surface-low hover:text-white"
                    )
                  }
                >
                  <Wallet2 className="h-4 w-4" />
                  <span>Wallet Control</span>
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="border-t border-outline-variant/15 pt-4">
            <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-sm text-on-subtle transition hover:bg-surface-low hover:text-white">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-sm text-on-subtle transition hover:bg-surface-low hover:text-white">
              <HelpCircle className="h-4 w-4" />
              <span>Support</span>
            </button>
          </div>
        </aside>

        <aside
          className={cn(
            "fixed inset-y-0 left-0 top-0 z-[60] w-[18rem] border-r border-outline-variant/15 bg-surface-lowest/96 px-5 py-5 backdrop-blur-2xl transition-transform lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
            <div>
              <p className="font-headline text-lg font-extrabold uppercase tracking-[0.12em] text-white">
                Diamond
              </p>
              <p className="text-[0.58rem] uppercase tracking-[0.22em] text-on-subtle">
                Sports Intelligence
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-outline-variant/15 bg-surface-low text-on-surface"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6">
            <WalletSummary />
          </div>

          <nav className="mt-6 flex flex-col gap-2">
            {filteredNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-[3rem] items-center px-4 font-headline text-xs font-bold uppercase tracking-[0.18em] transition",
                    isActive
                      ? "bg-primary-container/10 text-primary-container"
                      : "text-on-subtle hover:bg-surface-low hover:text-white"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="relative z-10 min-h-screen pt-24 md:ml-64">
          <main className="px-4 pb-12 pt-8 sm:px-6 lg:px-8">
            <div className="xl:hidden">
              <div className="mb-6">
                <WalletSummary />
              </div>
            </div>
            <Outlet />
          </main>

          <footer className="border-t border-outline-variant/15 bg-surface-lowest/88 backdrop-blur-xl">
            <div className="flex flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
              <div>
                <p className="font-headline text-2xl font-extrabold uppercase tracking-[0.12em] text-white">
                  Diamond Sportsbook
                </p>
                <p className="mt-3 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle">
                  Multi-sport parimutuel intelligence with realtime event routing.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle">
                  <Wallet2 className="h-3.5 w-3.5 text-primary-container" />
                  <span>Wallet ledger secured</span>
                </div>
              </div>
            </div>
          </footer>
        </div>

        <Betslip />
        <CharacterSetupGate />
      </div>
    </ToastProvider>
  );
};

export default RootLayout;
