import { Outlet, NavLink } from "react-router-dom";
import WalletSummary from "./WalletSummary";
import { cn } from "@lib/utils/cn";
import { useProfile } from "@domains/identity/hooks/useProfile";
import { ToastProvider } from "./ToastProvider";
import { Betslip } from "@domains/betting/components/Betslip";
import CharacterSetupGate from "./CharacterSetupGate";

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

  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-950 text-white">
        <header className="border-b border-white/10 bg-black/60 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="text-lg font-semibold tracking-wide">
              DBGP <span className="text-brand">v2</span>
            </div>
            <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
              {filteredNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-4 py-2 transition",
                      isActive
                        ? "bg-brand text-black"
                        : "text-white/70 hover:text-white"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <WalletSummary />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
        <Betslip />
        <CharacterSetupGate />
      </div>
    </ToastProvider>
  );
};

export default RootLayout;
