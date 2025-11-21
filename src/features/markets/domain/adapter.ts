import type { EventWithMarkets } from "@domains/betting/api/bettingApi";
import type { Pool, PoolStatus, Outcome } from "../types";

// Types that mirror the fetchMarketDetail response. We only rely on the fields we need.
export interface MarketDetailData {
  market: {
    id: string;
    name: string;
    status: string;
    description?: string | null;
    total_pool?: number | null;
    rake_percent?: number | null;
    close_time?: string | null;
    updated_at?: string | null;
    settled_at?: string | null;
    event?: {
      title?: string | null;
      takeout?: number | null;
    } | null;
  };
  outcomes: Array<{
    id: string;
    label: string;
    pool?: number | null;
  }>;
}

const statusMap: Record<string, PoolStatus> = {
  open: "open",
  closing_soon: "closing_soon",
  closed: "closed",
  settled: "settled",
  settlement_proposed: "settled",
  void: "closed",
  suspended: "closed"
};

const formatTimeRemaining = (closeTime?: string | null) => {
  if (!closeTime) return "No scheduled close";
  const closeDate = new Date(closeTime);
  if (Number.isNaN(closeDate.getTime())) return "No scheduled close";
  const diffMs = closeDate.getTime() - Date.now();
  const isPast = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);
  const hours = Math.round(minutes / 60);
  const label =
    minutes < 60 ? `${minutes}m` : hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
  return isPast ? `Closed · ${label} ago` : `Closes in ${label}`;
};

const formatLastUpdated = (updatedAt?: string | null) => {
  if (!updatedAt) return "—";
  const timestamp = new Date(updatedAt);
  if (Number.isNaN(timestamp.getTime())) return "—";
  const diffMs = Date.now() - timestamp.getTime();
  const minutes = Math.max(Math.round(diffMs / 60000), 0);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const computeOdds = (totalPool: number, outcomePool: number, rakeFraction: number) => {
  if (outcomePool <= 0) return 0;
  const rake = Math.max(0, Math.min(rakeFraction, 0.95));
  const distributable = totalPool * (1 - rake);
  const odds = distributable / outcomePool;
  return Number.isFinite(odds) ? odds : 0;
};

const mapOutcomes = (
  totalStake: number,
  rakeFraction: number,
  outcomes: MarketDetailData["outcomes"]
): Outcome[] =>
  outcomes.map((outcome) => {
    const staked = Number(outcome.pool ?? 0);
    return {
      id: outcome.id,
      teamName: outcome.label,
      driverName: outcome.label,
      marketShare: totalStake > 0 ? staked / totalStake : 0,
      baselineOdds: computeOdds(totalStake, staked, rakeFraction),
      numBets: 0,
      diamondsStaked: staked,
      trendDelta: 0
    };
  });

const buildPool = ({
  id,
  name,
  status,
  totalStake,
  closeTime,
  updatedAt,
  rakeFraction,
  outcomes
}: {
  id: string;
  name: string;
  status: string;
  totalStake: number;
  closeTime?: string | null;
  updatedAt?: string | null;
  rakeFraction: number;
  outcomes: MarketDetailData["outcomes"];
}): Pool => {
  const baseStatus = statusMap[status] ?? "open";
  const closesSoon =
    baseStatus === "open" &&
    closeTime &&
    new Date(closeTime).getTime() - Date.now() < 15 * 60 * 1000 &&
    new Date(closeTime).getTime() > Date.now();
  const uiStatus: PoolStatus = closesSoon ? "closing_soon" : baseStatus;

  return {
    id,
    title: name,
    status: uiStatus,
    totalStake,
    totalBets: 0,
    timeRemainingLabel: formatTimeRemaining(closeTime),
    rakePercent: Math.max(rakeFraction, 0) * 100,
    lastUpdatedLabel: formatLastUpdated(updatedAt),
    outcomes: mapOutcomes(totalStake, rakeFraction, outcomes)
  };
};

export const mapEventWithMarketsToUiPools = (events: EventWithMarkets[]): Pool[] => {
  const pools: Pool[] = [];

  events.forEach((event) => {
    const rakeFraction = Number(event.takeout ?? 0);
    event.markets
      .filter(
        (market) =>
          !market.archived &&
          ["open", "closed", "settled", "settlement_proposed"].includes(market.status as string)
      )
      .forEach((market) => {
        const pool = buildPool({
          id: market.id,
          name: market.name,
          status: market.status,
          totalStake: Number(market.total_pool ?? 0),
          closeTime: market.close_time ?? undefined,
          updatedAt: market.settled_at ?? undefined,
          rakeFraction,
          outcomes:
            market.outcomes?.map((outcome) => ({
              id: outcome.id,
              label: outcome.label,
              pool: outcome.pool ?? 0
            })) ?? []
        });
        pools.push(pool);
      });
  });

  return pools;
};

export const mapMarketDetailToUiPool = (detail: MarketDetailData | null): Pool | null => {
  if (!detail?.market) return null;
  const { market, outcomes } = detail;
  const totalStake = Number(market.total_pool ?? 0);
  const rakeFraction = Number(market.rake_percent ?? market.event?.takeout ?? 0);

  return buildPool({
    id: market.id,
    name: market.name,
    status: market.status,
    totalStake,
    closeTime: market.close_time ?? undefined,
    updatedAt: market.updated_at ?? market.settled_at ?? undefined,
    rakeFraction,
    outcomes: outcomes ?? []
  });
};
