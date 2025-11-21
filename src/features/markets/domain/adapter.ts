import type { LiveBet, Outcome, Pool, PoolStatus } from "../types";

// Data source notes:
// - RPC: get_pools_pricing / get_pool_pricing provide aggregated parimutuel totals + odds using wagers.
// - RPC: get_recent_pool_bets provides anonymized recent wagers; no user identifiers exposed.

export type PoolPricingRow = {
  pool_id: string;
  pool_name: string;
  pool_status: string;
  rake_percent: number | null;
  close_time: string | null;
  updated_at: string | null;
  total_stake: number | null;
  total_bets: number | null;
  last_activity_at: string | null;
  outcome_id: string;
  outcome_label: string;
  driver_name: string | null;
  outcome_stake: number | null;
  outcome_bets: number | null;
  baseline_odds: number | null;
};

export type DbLiveBet = {
  id: string;
  pool_id: string;
  outcome_id: string;
  team_name: string | null;
  driver_name: string | null;
  amount: number | null;
  odds_at_placement: number | null;
  created_at: string;
};

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
  if (!closeTime) return "No close time";
  const close = new Date(closeTime);
  if (Number.isNaN(close.getTime())) return "No close time";
  const diffMs = close.getTime() - Date.now();
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
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(Math.round(diffMs / 60000), 0);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const groupPricingRows = (rows: PoolPricingRow[]): Pool[] => {
  const poolsMap = new Map<string, Pool>();

  rows.forEach((row) => {
    const existing = poolsMap.get(row.pool_id);
    const totalStake = Number(row.total_stake ?? 0);
    const rakePercent = Number(row.rake_percent ?? 0) * 100;
    const closeTime = row.close_time;
    const baseStatus = statusMap[row.pool_status] ?? "open";
    const closesSoon =
      baseStatus === "open" &&
      closeTime &&
      new Date(closeTime).getTime() - Date.now() < 15 * 60 * 1000 &&
      new Date(closeTime).getTime() > Date.now();
    const uiStatus: PoolStatus = closesSoon ? "closing_soon" : baseStatus;
    const poolBase: Pool =
      existing ??
      {
        id: row.pool_id,
        title: row.pool_name,
        status: uiStatus,
        totalStake,
        totalBets: Number(row.total_bets ?? 0),
        timeRemainingLabel: formatTimeRemaining(closeTime),
        rakePercent,
        lastUpdatedLabel: formatLastUpdated(row.last_activity_at ?? row.updated_at),
        outcomes: []
      };

    const outcomeStake = Number(row.outcome_stake ?? 0);
    const outcome: Outcome = {
      id: row.outcome_id,
      teamName: row.outcome_label,
      driverName: row.driver_name ?? "—",
      marketShare: totalStake > 0 ? outcomeStake / totalStake : 0,
      baselineOdds: Number(row.baseline_odds ?? 0),
      numBets: Number(row.outcome_bets ?? 0),
      diamondsStaked: outcomeStake,
      trendDelta: 0
    };

    poolBase.outcomes = [...poolBase.outcomes, outcome];
    // totalStake/totalBets may be more accurate on later rows; keep max
    poolBase.totalStake = totalStake;
    poolBase.totalBets = Number(row.total_bets ?? poolBase.totalBets);
    poolBase.lastUpdatedLabel = formatLastUpdated(row.last_activity_at ?? row.updated_at);
    poolBase.status = uiStatus;
    poolsMap.set(row.pool_id, poolBase);
  });

  return Array.from(poolsMap.values());
};

export const mapPricingRowsToPools = (rows: PoolPricingRow[]): Pool[] => groupPricingRows(rows);

export const mapDbLiveBetToUiLiveBet = (bet: DbLiveBet): LiveBet => ({
  id: bet.id,
  poolId: bet.pool_id,
  outcomeId: bet.outcome_id,
  teamName: bet.team_name ?? "—",
  driverName: bet.driver_name ?? undefined,
  amount: Number(bet.amount ?? 0),
  placedAt: bet.created_at,
  oddsAtPlacement: Number(bet.odds_at_placement ?? 0)
});
