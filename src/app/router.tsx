import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./components/RootLayout";
import LiveTimingPage from "./live/LiveTimingPage";
import RaceControlPage from "./control/RaceControlPage";
import MarketsPage from "./markets/MarketsPage";
import MarketDetailPage from "./markets/MarketDetailPage";
import AccountPage from "./account/AccountPage";
import AdminDashboard from "./admin/AdminDashboard";

export const router = createBrowserRouter([
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
        path: "control/:sessionId",
        element: <RaceControlPage />
      },
      {
        path: "account",
        element: <AccountPage />
      },
      {
        path: "admin",
        element: <AdminDashboard />
      }
    ]
  }
]);
