import { supabase } from "@lib/supabaseClient";

export type MarketContainerStatus = "draft" | "upcoming" | "active" | "in_settlement" | "settled" | "archived";
export type PoolStatus =
  | "draft"
  | "open"
  | "suspended"
  | "closed"
  | "settlement_proposed"
  | "settled"
  | "void";

export interface MarketPool {
  id: string;
  name: string;
  description: string | null;
  status: PoolStatus;
  archived?: boolean;
  settled_at?: string | null;
  pool_type: string;
  rake_percent: number;
  total_pool: number;
  min_stake: number;
  max_stake: number;
  close_time: string | null;
  settlement_payload: Record<string, unknown> | null;
  pending_settlement?: {
    pool_id: string;
    status: string;
    winning_outcome_id: string | null;
    summary: Record<string, unknown> | null;
  } | null;
  outcomes: Array<{
    id: string;
    label: string;
    pool: number;
    color: string | null;
    driver_id: string | null;
  }>;
}

export interface MarketContainer {
  id: string;
  title: string;
  description: string | null;
  status: MarketContainerStatus;
  starts_at: string | null;
  takeout: number;
  session: {
    id: string;
    name: string;
    track_name: string | null;
    mode: string | null;
    starts_at: string | null;
  } | null;
  markets: MarketPool[];
}

const sessionSelect = `session:timing_sessions(id, name, track_name, mode, starts_at)`;
const outcomeSelect = `outcomes(id, label, pool, color, driver_id)`;
const pendingSelect = `pending_settlement:pending_settlements(pool_id, status, winning_outcome_id, summary)`;

const unwrapSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
};

export const fetchAdminMarkets = async () => {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
        id,
        title,
        description,
        status,
        starts_at,
        takeout,
        ${sessionSelect},
        markets:markets(
          id,
          name,
          description,
          status,
          archived,
          settled_at,
          pool_type,
          rake_percent,
          total_pool,
          min_stake,
          max_stake,
          close_time
        )
      `
    )
    .order("starts_at", { ascending: true });

  if (error) throw error;

  return (
    data?.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      status: row.status as MarketContainerStatus,
      starts_at: row.starts_at ?? null,
      takeout: Number(row.takeout ?? 0),
      session: (() => {
        const sessionRow = unwrapSingle(row.session);
        return sessionRow
          ? {
              id: sessionRow.id,
              name: sessionRow.name,
              track_name: sessionRow.track_name ?? null,
              mode: sessionRow.mode ?? null,
              starts_at: sessionRow.starts_at ?? null
            }
          : null;
      })(),
      markets: (row.markets ?? []).map((pool: any) => ({
        id: pool.id,
        name: pool.name,
        description: pool.description ?? null,
        status: pool.status as PoolStatus,
        archived: !!pool.archived,
        settled_at: pool.settled_at ?? null,
        pool_type: pool.pool_type,
        rake_percent: Number(pool.rake_percent ?? 0),
        total_pool: Number(pool.total_pool ?? 0),
        min_stake: Number(pool.min_stake ?? 0),
        max_stake: Number(pool.max_stake ?? 0),
        close_time: pool.close_time ?? null,
        settlement_payload: null,
        outcomes: []
      }))
    })) ?? []
  ) as MarketContainer[];
};

export const fetchAdminMarketDetail = async (marketId: string): Promise<MarketContainer> => {
  const { data, error } = await supabase
    .from("events")
    .select(
      `
        id,
        title,
        description,
        status,
        starts_at,
        takeout,
        ${sessionSelect},
        markets:markets(
          id,
          name,
          description,
          status,
          archived,
          settled_at,
          pool_type,
          rake_percent,
          total_pool,
          min_stake,
          max_stake,
          close_time,
          settlement_payload,
          ${pendingSelect},
          ${outcomeSelect}
        )
      `
    )
    .eq("id", marketId)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description ?? null,
    status: data.status as MarketContainerStatus,
    starts_at: data.starts_at ?? null,
    takeout: Number(data.takeout ?? 0),
    session: (() => {
      const sessionRow = unwrapSingle(data.session);
      return sessionRow
        ? {
            id: sessionRow.id,
            name: sessionRow.name,
            track_name: sessionRow.track_name ?? null,
            mode: sessionRow.mode ?? null,
            starts_at: sessionRow.starts_at ?? null
          }
        : null;
    })(),
    markets: (data.markets ?? []).map((pool: any) => ({
      id: pool.id,
      name: pool.name,
      description: pool.description ?? null,
      status: pool.status as PoolStatus,
      archived: !!pool.archived,
      settled_at: pool.settled_at ?? null,
      pool_type: pool.pool_type,
      rake_percent: Number(pool.rake_percent ?? 0),
      total_pool: Number(pool.total_pool ?? 0),
      min_stake: Number(pool.min_stake ?? 0),
      max_stake: Number(pool.max_stake ?? 0),
      close_time: pool.close_time ?? null,
      settlement_payload: pool.settlement_payload ?? null,
      pending_settlement: unwrapSingle(pool.pending_settlement),
      outcomes:
        pool.outcomes?.map((outcome: any) => ({
          id: outcome.id,
          label: outcome.label,
          pool: Number(outcome.pool ?? 0),
          color: outcome.color ?? null,
          driver_id: outcome.driver_id ?? null
        })) ?? []
    }))
  };
};

export interface MarketWizardPoolInput {
  name: string;
  description?: string;
  pool_type?: string;
  rake_percent?: number;
  min_stake?: number;
  max_stake?: number;
  close_time?: string;
}

export interface MarketWizardPayload {
  sessionId: string;
  title: string;
  description?: string;
  takeout?: number;
  startsAt?: string;
  pools: MarketWizardPoolInput[];
}

export const createMarketWizard = async (payload: MarketWizardPayload) => {
  const { data, error } = await supabase.rpc("market_create_from_session", {
    p_session_id: payload.sessionId,
    p_title: payload.title,
    p_description: payload.description ?? null,
    p_takeout: payload.takeout ?? null,
    p_starts_at: payload.startsAt ?? null,
    p_pools: payload.pools
  });

  if (error) throw error;
  return data;
};

const callPoolRpc = async (fn: string, poolId: string, extra?: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(fn, {
    p_pool_id: poolId,
    ...(extra ?? {})
  });
  if (error) throw error;
  return data;
};

export const openPool = (poolId: string) => callPoolRpc("market_pool_open", poolId);
export const closePool = (poolId: string) => callPoolRpc("market_pool_close", poolId);
export const suspendPool = (poolId: string) => callPoolRpc("market_pool_suspend", poolId);
export const voidPool = (poolId: string, reason?: string) =>
  callPoolRpc("market_pool_void", poolId, { p_reason: reason ?? null });
export const archivePool = (poolId: string) => callPoolRpc("market_pool_archive", poolId);
export const restorePool = (poolId: string) => callPoolRpc("market_pool_restore", poolId);

export interface SettlementPreview {
  pool_id: string;
  market_id: string;
  outcome_id: string;
  outcome_label: string;
  handle: number;
  rake_percent: number;
  rake_amount: number;
  distribution_pool: number;
  payout_per_unit: number;
  winners: Array<{
    wager_id: string;
    user_id: string;
    stake: number;
    payout: number;
  }>;
}

export const previewSettlement = async (poolId: string, outcomeId: string) => {
  const { data, error } = await supabase.rpc("market_pool_preview_settlement", {
    p_pool_id: poolId,
    p_winning_outcome: outcomeId
  });

  if (error) throw error;
  return data as SettlementPreview;
};

export const proposeSettlement = async (poolId: string, outcomeId: string) => {
  const { data, error } = await supabase.rpc("market_pool_propose_settlement", {
    p_pool_id: poolId,
    p_winning_outcome: outcomeId
  });
  if (error) throw error;
  return data;
};

export const confirmSettlement = async (poolId: string) => {
  const { data, error } = await supabase.rpc("market_pool_confirm_settlement", {
    p_pool_id: poolId
  });
  if (error) throw error;
  return data;
};

export interface AdminWagerRow {
  wager_id: string;
  pool_id: string;
  pool_name: string;
  outcome_id: string;
  outcome_label: string;
  user_id: string;
  user_name: string | null;
  stake: number;
  status: string;
  created_at: string;
}

export const fetchMarketWagers = async (marketId: string, poolId?: string) => {
  const { data, error } = await supabase.rpc("market_admin_wagers", {
    p_market_id: marketId,
    p_pool_id: poolId ?? null
  });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    wager_id: row.wager_id,
    pool_id: row.pool_id,
    pool_name: row.pool_name,
    outcome_id: row.outcome_id,
    outcome_label: row.outcome_label,
    user_id: row.user_id,
    user_name: row.user_name ?? null,
    stake: Number(row.stake ?? 0),
    status: row.status,
    created_at: row.created_at
  })) as AdminWagerRow[];
};

export interface WalletActivityRow {
  id: string;
  amount: number;
  kind: string;
  user_id: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export const fetchWalletActivityForMarket = async (marketId: string, poolId?: string) => {
  const query = supabase
    .from("wallet_transactions")
    .select("id, amount, kind, meta, created_at, wallet_accounts!inner(user_id)")
    .contains("meta", { market_container_id: marketId })
    .order("created_at", { ascending: false })
    .limit(100);

  if (poolId) {
    query.contains("meta", { pool_id: poolId });
  }

  const { data, error } = await query;
  if (error) throw error;

  return (
    data?.map((row) => ({
      id: row.id,
      amount: Number(row.amount ?? 0),
      kind: row.kind,
      user_id: (() => {
        const accounts = row.wallet_accounts as
          | { user_id: string }
          | { user_id: string }[]
          | null
          | undefined;
        if (Array.isArray(accounts)) {
          return accounts[0]?.user_id ?? "";
        }
        return accounts?.user_id ?? "";
      })(),
      meta: row.meta ?? {},
      created_at: row.created_at
    })) ?? []
  ) as WalletActivityRow[];
};

export interface RakeLedgerEntry {
  id: string;
  amount: number;
  meta: Record<string, unknown>;
  created_at: string;
  pool_id: string;
}

export const fetchRakeLedger = async (marketId: string) => {
  const { data, error } = await supabase
    .from("market_rake_ledger")
    .select("id, amount, meta, created_at, pool_id")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (
    data?.map((row) => ({
      id: row.id,
      amount: Number(row.amount ?? 0),
      meta: row.meta ?? {},
      created_at: row.created_at,
      pool_id: row.pool_id
    })) ?? []
  ) as RakeLedgerEntry[];
};
