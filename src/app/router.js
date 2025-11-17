import { jsx as _jsx } from "react/jsx-runtime";
import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./components/RootLayout";
import LiveTimingPage from "./live/LiveTimingPage";
import RaceControlPage from "./control/RaceControlPage";
import MarketsPage from "./markets/MarketsPage";
import MarketDetailPage from "./markets/MarketDetailPage";
import AccountPage from "./account/AccountPage";
import AdminDashboard from "./admin/AdminDashboard";
import SessionSetupPage from "./admin/SessionSetupPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { LoginPage } from "./auth/LoginPage";
export const router = createBrowserRouter([
    {
        path: "/login",
        element: _jsx(LoginPage, {})
    },
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
                path: "account",
                element: _jsx(AccountPage, {})
            },
            {
                element: _jsx(ProtectedRoute, { requiredRoles: ["race_control", "super_admin"] }),
                children: [
                    {
                        path: "control/:sessionId",
                        element: _jsx(RaceControlPage, {})
                    }
                ]
            },
            {
                element: _jsx(ProtectedRoute, { requiredRoles: ["betting_admin", "super_admin", "race_control"] }),
                children: [
                    {
                        path: "admin",
                        element: _jsx(AdminDashboard, {})
                    },
                    {
                        path: "admin/session-setup",
                        element: _jsx(SessionSetupPage, {})
                    }
                ]
            }
        ]
    }
]);
