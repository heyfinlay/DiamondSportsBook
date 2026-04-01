import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@app/components/ToastProvider";
import { fetchAdminMarkets } from "@domains/betting/api/marketAdminApi";
import MarketManagementPage from "./MarketManagementPage";
vi.mock("@domains/betting/api/marketAdminApi", async () => {
    const actual = await vi.importActual("@domains/betting/api/marketAdminApi");
    return {
        ...actual,
        fetchAdminMarkets: vi.fn()
    };
});
vi.mock("./MarketBuilderWizard", () => ({
    default: () => null
}));
const mockedFetchAdminMarkets = vi.mocked(fetchAdminMarkets);
const marketFixtures = [
    {
        id: "event-external",
        title: "St George Illawarra Dragons vs North Queensland Cowboys",
        description: "Auto-generated NRL winner board sourced from the live schedule feed.",
        source_type: "external_feed",
        sport_code: "nrl",
        auto_created: true,
        external_status: "live",
        market_type: "WINNER_FULL_FIELD",
        scope: "race",
        config: {},
        status: "active",
        starts_at: "2026-04-04T06:30:00+00:00",
        takeout: 0.12,
        session: null,
        competition: { name: "NRL Premiership" },
        sports_event: { venue_name: "Accor Stadium", round_label: "Round 7" },
        markets: [
            {
                id: "pool-external",
                name: "Winner",
                label: "Winner",
                description: null,
                status: "closed",
                pool_type: "winner",
                rake_percent: 0.12,
                total_pool: 4200,
                min_stake: 10,
                max_stake: 10000,
                close_time: "2026-04-04T06:30:00+00:00",
                config: {},
                settlement_payload: null,
                outcomes: []
            }
        ]
    },
    {
        id: "event-manual",
        title: "Albert Park Practice Pool",
        description: "Operator-built slate for a timing session.",
        source_type: "manual_timing",
        sport_code: null,
        auto_created: false,
        external_status: null,
        market_type: "HEAD_TO_HEAD",
        scope: "qualifying",
        config: {},
        status: "upcoming",
        starts_at: "2026-04-05T03:00:00+00:00",
        takeout: 0.08,
        session: {
            id: "session-1",
            name: "Practice 1",
            track_name: "Albert Park",
            mode: "practice",
            starts_at: "2026-04-05T03:00:00+00:00"
        },
        competition: null,
        sports_event: null,
        markets: [
            {
                id: "pool-manual",
                name: "Head to Head",
                label: "Head to Head",
                description: null,
                status: "draft",
                pool_type: "h2h",
                rake_percent: 0.08,
                total_pool: 0,
                min_stake: 10,
                max_stake: 10000,
                close_time: "2026-04-05T03:00:00+00:00",
                config: {},
                settlement_payload: null,
                outcomes: []
            }
        ]
    }
];
const renderPage = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
    return render(_jsx(MemoryRouter, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(ToastProvider, { children: _jsx(MarketManagementPage, {}) }) }) }));
};
describe("MarketManagementPage", () => {
    beforeEach(() => {
        mockedFetchAdminMarkets.mockReset();
    });
    it("renders source-first summaries for external and manual slates", async () => {
        mockedFetchAdminMarkets.mockResolvedValue(marketFixtures);
        renderPage();
        await screen.findByRole("heading", { name: "Market Management" });
        await screen.findByText("St George Illawarra Dragons vs North Queensland Cowboys");
        fireEvent.click(screen.getByRole("button", { name: "All" }));
        await screen.findByText("Albert Park Practice Pool");
        expect(screen.getAllByText("External Feed").length).toBeGreaterThan(0);
        expect(screen.getByText("Manual Builds")).toBeTruthy();
        expect(screen.getByText("NRL • NRL Premiership • Accor Stadium")).toBeTruthy();
        expect(screen.getByText("Practice 1 • Albert Park")).toBeTruthy();
        expect(screen.getByText("Round 7 • feed live • 1 pool")).toBeTruthy();
        expect(screen.getByText("Takeout 12.0% • 0 currently open")).toBeTruthy();
        expect(screen.getByRole("button", { name: "New Market" })).toBeTruthy();
        expect(screen.getAllByText("Open Slate")).toHaveLength(2);
    });
});
