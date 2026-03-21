import { useMemo, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, CircleUserRound, Menu, ShieldCheck, Wallet2, X } from "lucide-react";
import WalletSummary from "./WalletSummary";
import { cn } from "@lib/utils/cn";
import { useProfile } from "@domains/identity/hooks/useProfile";
import { ToastProvider } from "./ToastProvider";
import { Betslip } from "@domains/betting/components/Betslip";
import CharacterSetupGate from "./CharacterSetupGate";
import { supabase } from "@lib/supabaseClient";

const navItems = [
  { to: "/", label: "Markets" },
  { to: "/standings", label: "Results" },
  { to: "/wagers", label: "Live Pool" },
  { to: "/account", label: "Vault" }
];

const footerLinks = [
  { href: "/standings", label: "Results" },
  { href: "/wagers", label: "My Wagers" },
  { href: "/account", label: "Vault" }
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
        .select("id, is_active, name, track_name")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  const filteredNav = [
    ...navItems,
    ...(canAdmin ? [{ to: "/admin", label: "Ops" }] : [])
  ];

  const tickerItems = useMemo(
    () => [
      liveSessionQuery.data?.id
        ? `Live telemetry connected${liveSessionQuery.data.track_name ? ` • ${liveSessionQuery.data.track_name}` : ""}`
        : "Telemetry standby",
      canAdmin ? "Admin routing authorized" : "Player vault active",
      "Prismatic pool pricing online"
    ],
    [canAdmin, liveSessionQuery.data]
  );

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "inline-flex h-16 items-center border-b-2 px-1 font-headline text-[0.85rem] font-bold uppercase tracking-[0.14em] transition-colors",
      isActive
        ? "border-primary-container text-primary-container"
        : "border-transparent text-on-subtle hover:text-white"
    );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-on-surface prismatic-grid">
        <div className="fixed inset-x-0 top-0 z-40 border-b border-outline-variant/20 bg-surface-lowest/95 backdrop-blur-xl">
          <div className="mx-auto flex h-8 max-w-[1600px] items-center overflow-hidden px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-full items-center gap-8 whitespace-nowrap">
              {tickerItems.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.2em] text-on-subtle"
                >
                  {index === 0 ? (
                    <span className="inline-flex h-1.5 w-1.5 bg-primary-container" />
                  ) : (
                    <span className="inline-flex h-1.5 w-1.5 bg-danger" />
                  )}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 top-8 z-40 border-b border-white/5 bg-surface/80 backdrop-blur-xl">
          <header className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-6 lg:gap-12">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center border border-white/10 text-on-surface lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <NavLink to="/" className="min-w-0 font-headline text-xl font-extrabold uppercase tracking-[0.15em] text-white">
                Diamond Sportsbook
              </NavLink>
              <nav className="hidden items-center gap-8 lg:flex">
                {filteredNav.map((item) => (
                  <NavLink key={item.to} to={item.to} className={navLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
                {liveSessionQuery.data?.id ? (
                  <NavLink to={`/live/${liveSessionQuery.data.id}`} className={navLinkClass}>
                    Live Data
                  </NavLink>
                ) : null}
              </nav>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden min-w-[220px] lg:block">
                <WalletSummary />
              </div>
              <button type="button" className="hidden h-10 w-10 items-center justify-center text-on-subtle transition hover:text-white sm:inline-flex">
                <Bell className="h-4 w-4" />
              </button>
              <NavLink
                to="/account"
                className="inline-flex h-10 w-10 items-center justify-center border border-white/10 bg-surface-highest text-on-surface transition hover:border-primary-container/40 hover:text-primary-container"
                aria-label="Open account"
              >
                <CircleUserRound className="h-5 w-5" />
              </NavLink>
            </div>
          </header>
        </div>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/70 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
        ) : null}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[18rem] border-r border-white/10 bg-surface-lowest/95 px-5 py-5 backdrop-blur-2xl transition-transform lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <p className="font-headline text-base font-extrabold uppercase tracking-[0.16em] text-white">
                Diamond
              </p>
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-on-subtle">
                Prismatic Routing
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-white/10 text-on-surface"
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
                    "flex min-h-[3rem] items-center border px-4 font-headline text-xs font-bold uppercase tracking-[0.18em] transition",
                    isActive
                      ? "border-primary-container/40 bg-primary-container text-on-primary"
                      : "border-white/10 bg-surface-low text-on-subtle hover:border-white/20 hover:text-white"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {liveSessionQuery.data?.id ? (
              <NavLink
                to={`/live/${liveSessionQuery.data.id}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-[3rem] items-center border px-4 font-headline text-xs font-bold uppercase tracking-[0.18em] transition",
                    isActive
                      ? "border-primary-container/40 bg-primary-container text-on-primary"
                      : "border-white/10 bg-surface-low text-on-subtle hover:border-white/20 hover:text-white"
                  )
                }
              >
                Live Data
              </NavLink>
            ) : null}
          </nav>
        </aside>

        <div className="relative z-10 flex min-h-screen flex-col pt-24">
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="lg:hidden">
              <div className="mb-6">
                <WalletSummary />
              </div>
            </div>
            <Outlet />
          </main>

          <footer className="border-t border-white/5 bg-surface-lowest/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
              <div>
                <p className="font-headline text-2xl font-extrabold uppercase tracking-[0.14em] text-white">
                  Diamond Sportsbook
                </p>
                <p className="mt-3 text-[0.72rem] uppercase tracking-[0.2em] text-on-subtle">
                  The Diamond Standard Of Pari-Mutuel Trading.
                </p>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[0.72rem] uppercase tracking-[0.16em] text-on-subtle">
                  {footerLinks.map((link) => (
                    <NavLink key={link.href} to={link.href} className="transition hover:text-white">
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-on-subtle">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-dim" />
                  <span>Encrypted Vault Routing Active</span>
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
