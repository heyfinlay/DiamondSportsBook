import { jsx as _jsx } from "react/jsx-runtime";
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
                path: "active-markets",
                element: _jsx(MarketsPage, {})
            },
            {
                path: "market/:marketId",
                element: _jsx(MarketDetailPage, {})
            },
            {
                path: "events/:eventId",
                element: _jsx(EventDetailPage, {})
            },
            {
                path: "live/:sessionId",
                element: _jsx(LiveTimingPage, {})
            },
            {
                path: "standings",
                element: _jsx(StandingsPage, {})
            },
            {
                path: "account",
                element: _jsx(AccountPage, {})
            },
            {
                element: _jsx(ProtectedRoute, {}),
                children: [
                    {
                        path: "account/settings",
                        element: _jsx(AccountSettingsPage, {})
                    },
                    {
                        path: "wagers",
                        element: _jsx(WagersPage, {})
                    },
                    {
                        path: "wagers/:wagerId",
                        element: _jsx(WagerDetailPage, {})
                    }
                ]
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
                element: _jsx(ProtectedRoute, { requiredRoles: ["betting_admin", "sportsbook_admin", "super_admin", "race_control"] }),
                children: [
                    {
                        path: "admin",
                        element: _jsx(AdminDashboard, {})
                    },
                    {
                        path: "admin/session-setup",
                        element: _jsx(SessionSetupPage, {})
                    },
                    {
                        path: "admin/timing-sessions",
                        element: _jsx(TimingSessionsPage, {})
                    },
                    {
                        path: "admin/settlements",
                        element: _jsx(SettlementAuditPage, {})
                    },
                    {
                        path: "admin/settlements/:poolId",
                        element: _jsx(PoolPayoutDetailPage, {})
                    },
                    {
                        path: "admin/championship",
                        element: _jsx(AdminChampionshipPage, {})
                    },
                    {
                        path: "dashboard/admin/markets",
                        element: _jsx(MarketManagementPage, {})
                    },
                    {
                        path: "dashboard/admin/markets/:marketId",
                        element: _jsx(MarketDetailAdminPage, {})
                    }
                ]
            },
            {
                path: "auth/callback",
                element: _jsx(AuthCallbackPage, {})
            }
        ]
    }
]);
