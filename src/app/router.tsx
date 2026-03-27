import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./components/RootLayout";
import LiveTimingPage from "./live/LiveTimingPage";
import RaceControlPage from "./control/RaceControlPage";
import MarketsPage from "./markets/MarketsPage";
import MarketDetailPage from "./markets/MarketDetailPage";
import EventDetailPage from "./events/EventDetailPage";
import StandingsPage from "./standings/page";
import AccountPage from "./account/AccountPage";
import AccountSettingsPage from "./account/AccountSettingsPage";
import AdminDashboard from "./admin/AdminDashboard";
import AdminChampionshipPage from "./admin/ChampionshipPage";
import MarketManagementPage from "./admin/markets/MarketManagementPage";
import MarketDetailAdminPage from "./admin/markets/MarketDetailAdminPage";
import SessionSetupPage from "./admin/SessionSetupPage";
import TimingSessionsPage from "./admin/TimingSessionsPage";
import SettlementAuditPage, { PoolPayoutDetailPage } from "./admin/SettlementAuditPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { LoginPage } from "./auth/LoginPage";
import AuthCallbackPage from "./auth/AuthCallbackPage";
import WagersPage from "./wagers/WagersPage";
import WagerDetailPage from "./wagers/WagerDetailPage";

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <MarketsPage />
      },
      {
        path: "active-markets",
        element: <MarketsPage />
      },
      {
        path: "market/:marketId",
        element: <MarketDetailPage />
      },
      {
        path: "events/:eventId",
        element: <EventDetailPage />
      },
      {
        path: "live/:sessionId",
        element: <LiveTimingPage />
      },
      {
        path: "standings",
        element: <StandingsPage />
      },
      {
        path: "account",
        element: <AccountPage />
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "account/settings",
            element: <AccountSettingsPage />
          },
          {
            path: "wagers",
            element: <WagersPage />
          },
          {
            path: "wagers/:wagerId",
            element: <WagerDetailPage />
          }
        ]
      },
      {
        element: <ProtectedRoute requiredRoles={["race_control", "super_admin"]} />,
        children: [
          {
            path: "control/:sessionId",
            element: <RaceControlPage />
          }
        ]
      },
      {
        element: <ProtectedRoute requiredRoles={["betting_admin", "sportsbook_admin", "super_admin", "race_control"]} />,
        children: [
          {
            path: "admin",
            element: <AdminDashboard />
          },
          {
            path: "admin/session-setup",
            element: <SessionSetupPage />
          },
          {
            path: "admin/timing-sessions",
            element: <TimingSessionsPage />
          },
          {
            path: "admin/settlements",
            element: <SettlementAuditPage />
          },
          {
            path: "admin/settlements/:poolId",
            element: <PoolPayoutDetailPage />
          },
          {
            path: "admin/championship",
            element: <AdminChampionshipPage />
          },
          {
            path: "dashboard/admin/markets",
            element: <MarketManagementPage />
          },
          {
            path: "dashboard/admin/markets/:marketId",
            element: <MarketDetailAdminPage />
          }
        ]
      },
      {
        path: "auth/callback",
        element: <AuthCallbackPage />
      }
    ]
  }
]);
