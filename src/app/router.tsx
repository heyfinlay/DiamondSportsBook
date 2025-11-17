import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./components/RootLayout";
import LiveTimingPage from "./live/LiveTimingPage";
import RaceControlPage from "./control/RaceControlPage";
import MarketsPage from "./markets/MarketsPage";
import MarketDetailPage from "./markets/MarketDetailPage";
import AccountPage from "./account/AccountPage";
import AdminDashboard from "./admin/AdminDashboard";
import SessionSetupPage from "./admin/SessionSetupPage";
import TimingSessionsPage from "./admin/TimingSessionsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { LoginPage } from "./auth/LoginPage";

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
        path: "market/:marketId",
        element: <MarketDetailPage />
      },
      {
        path: "live/:sessionId",
        element: <LiveTimingPage />
      },
      {
        path: "account",
        element: <AccountPage />
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
        element: <ProtectedRoute requiredRoles={["betting_admin", "super_admin", "race_control"]} />,
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
          }
        ]
      }
    ]
  }
]);
