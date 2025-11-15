import { jsx as _jsx } from "react/jsx-runtime";
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
        element: _jsx(RootLayout, {}),
        children: [
            {
                index: true,
                element: _jsx(MarketsPage, {})
            },
            {
                path: "market/:marketId",
                element: _jsx(MarketDetailPage, {})
            },
            {
                path: "live/:sessionId",
                element: _jsx(LiveTimingPage, {})
            },
            {
                path: "control/:sessionId",
                element: _jsx(RaceControlPage, {})
            },
            {
                path: "account",
                element: _jsx(AccountPage, {})
            },
            {
                path: "admin",
                element: _jsx(AdminDashboard, {})
            }
        ]
    }
]);
