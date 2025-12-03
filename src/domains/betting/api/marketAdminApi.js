import { supabase } from "@lib/supabaseClient";
const sessionSelect = `session:timing_sessions(id, name, track_name, mode, starts_at)`;
const outcomeSelect = `outcomes(id, label, pool, color, driver_id, metadata, participant_type, participant_id)`;
const pendingSelect = `pending_settlement:pending_settlements(pool_id, status, winning_outcome_id, summary)`;
const unwrapSingle = (value) => {
    if (!value)
        return null;
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value;
};
export const fetchAdminMarkets = async () => {
    const { data, error } = await supabase
        .from("events")
        .select(`
        id,
        title,
        description,
        status,
        market_type,
        scope,
        config,
        starts_at,
        takeout,
        ${sessionSelect},
        markets:markets(
          id,
          name,
          label,
          description,
          status,
          archived,
          settled_at,
          archived_at,
          pool_type,
          rake_percent,
          total_pool,
          min_stake,
          max_stake,
          close_time,
          config
        )
      `)
        .order("starts_at", { ascending: true });
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        market_type: (row.market_type ?? "WINNER_FULL_FIELD"),
        scope: (row.scope ?? "race"),
        config: row.config ?? {},
        status: row.status,
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
        markets: (row.markets ?? []).map((pool) => ({
            id: pool.id,
            name: pool.name,
            label: pool.label ?? pool.name,
            description: pool.description ?? null,
            status: pool.status,
            archived: !!pool.archived,
            settled_at: pool.settled_at ?? null,
            archived_at: pool.archived_at ?? null,
            pool_type: pool.pool_type,
            rake_percent: Number(pool.rake_percent ?? 0),
            total_pool: Number(pool.total_pool ?? 0),
            min_stake: Number(pool.min_stake ?? 0),
            max_stake: Number(pool.max_stake ?? 0),
            close_time: pool.close_time ?? null,
            config: pool.config ?? {},
            settlement_payload: null,
            outcomes: []
        }))
    })) ?? []);
};
export const fetchAdminMarketDetail = async (marketId) => {
    const { data, error } = await supabase
        .from("events")
        .select(`
        id,
        title,
        description,
        status,
        market_type,
        scope,
        config,
        starts_at,
        takeout,
        ${sessionSelect},
        markets:markets(
          id,
          name,
          label,
          description,
          status,
          archived,
          settled_at,
          archived_at,
          pool_type,
          rake_percent,
          total_pool,
          min_stake,
          max_stake,
          close_time,
          config,
          settlement_payload,
          ${pendingSelect},
          ${outcomeSelect}
        )
      `)
        .eq("id", marketId)
        .single();
    if (error)
        throw error;
    return {
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        market_type: (data.market_type ?? "WINNER_FULL_FIELD"),
        scope: (data.scope ?? "race"),
        config: data.config ?? {},
        status: data.status,
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
        markets: (data.markets ?? []).map((pool) => ({
            id: pool.id,
            name: pool.name,
            label: pool.label ?? pool.name,
            description: pool.description ?? null,
            status: pool.status,
            archived: !!pool.archived,
            settled_at: pool.settled_at ?? null,
            archived_at: pool.archived_at ?? null,
            pool_type: pool.pool_type,
            rake_percent: Number(pool.rake_percent ?? 0),
            total_pool: Number(pool.total_pool ?? 0),
            min_stake: Number(pool.min_stake ?? 0),
            max_stake: Number(pool.max_stake ?? 0),
            close_time: pool.close_time ?? null,
            config: pool.config ?? {},
            settlement_payload: pool.settlement_payload ?? null,
            pending_settlement: unwrapSingle(pool.pending_settlement),
            outcomes: pool.outcomes?.map((outcome) => ({
                id: outcome.id,
                label: outcome.label,
                pool: Number(outcome.pool ?? 0),
                color: outcome.color ?? null,
                driver_id: outcome.driver_id ?? null,
                participant_type: outcome.participant_type ?? undefined,
                participant_id: outcome.participant_id ?? undefined,
                metadata: outcome.metadata ?? null
            })) ?? []
        }))
    };
};
export const createMarketWizard = async (payload) => {
    const { data, error } = await supabase.rpc("market_create_from_session", {
        p_session_id: payload.sessionId,
        p_title: payload.title,
        p_description: payload.description ?? null,
        p_takeout: payload.takeout ?? null,
        p_starts_at: payload.startsAt ?? null,
        p_pools: payload.pools
    });
    if (error)
        throw error;
    return data;
};
export const createMarketBuilder = async (payload) => {
    const { data, error } = await supabase.rpc("market_builder_create", {
        p_session_id: payload.sessionId,
        p_title: payload.title,
        p_market_type: payload.marketType,
        p_scope: payload.scope,
        p_description: payload.description ?? null,
        p_takeout: payload.takeout ?? null,
        p_starts_at: payload.startsAt ?? null,
        p_config: payload.config ?? {},
        p_pools: payload.pools
    });
    if (error)
        throw error;
    return data;
};
export const fetchSessionDrivers = async (sessionId) => {
    const { data, error } = await supabase
        .from("timing_drivers")
        .select("id, name, number, team_name, primary_color, secondary_color")
        .eq("session_id", sessionId)
        .order("number", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
    if (error)
        throw error;
    return (data?.map((driver) => ({
        id: driver.id,
        name: driver.name,
        number: driver.number ?? null,
        team_name: driver.team_name ?? null,
        primary_color: driver.primary_color ?? null,
        secondary_color: driver.secondary_color ?? null
    })) ?? []);
};
export const fetchChampionshipTeams = async () => {
    const { data, error } = await supabase
        .from("championship_teams")
        .select("id, name, primary_color, secondary_color")
        .order("name", { ascending: true })
        .limit(200);
    if (error)
        throw error;
    return (data?.map((team) => ({
        id: team.id,
        name: team.name,
        primary_color: team.primary_color ?? null,
        secondary_color: team.secondary_color ?? null
    })) ?? []);
};
const callPoolRpc = async (fn, poolId, extra) => {
    const { data, error } = await supabase.rpc(fn, {
        p_pool_id: poolId,
        ...(extra ?? {})
    });
    if (error)
        throw error;
    return data;
};
export const openPool = (poolId) => callPoolRpc("market_pool_open", poolId);
export const closePool = (poolId) => callPoolRpc("market_pool_close", poolId);
export const suspendPool = (poolId) => callPoolRpc("market_pool_suspend", poolId);
export const voidPool = (poolId, reason) => callPoolRpc("market_pool_void", poolId, { p_reason: reason ?? null });
export const archivePool = (poolId) => callPoolRpc("market_pool_archive", poolId);
export const restorePool = (poolId) => callPoolRpc("market_pool_restore", poolId);
export const previewSettlement = async (poolId, outcomeId) => {
    const { data, error } = await supabase.rpc("market_pool_preview_settlement", {
        p_pool_id: poolId,
        p_winning_outcome: outcomeId
    });
    if (error)
        throw error;
    return data;
};
export const proposeSettlement = async (poolId, outcomeId) => {
    const { data, error } = await supabase.rpc("market_pool_propose_settlement", {
        p_pool_id: poolId,
        p_winning_outcome: outcomeId
    });
    if (error)
        throw error;
    return data;
};
export const confirmSettlement = async (poolId) => {
    const { data, error } = await supabase.rpc("market_pool_confirm_settlement", {
        p_pool_id: poolId
    });
    if (error)
        throw error;
    return data;
};
export const fetchMarketWagers = async (marketId, poolId) => {
    const { data, error } = await supabase.rpc("market_admin_wagers", {
        p_market_id: marketId,
        p_pool_id: poolId ?? null
    });
    if (error)
        throw error;
    return (data ?? []).map((row) => ({
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
    }));
};
export const fetchWalletActivityForMarket = async (marketId, poolId) => {
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
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        kind: row.kind,
        user_id: (() => {
            const accounts = row.wallet_accounts;
            if (Array.isArray(accounts)) {
                return accounts[0]?.user_id ?? "";
            }
            return accounts?.user_id ?? "";
        })(),
        meta: row.meta ?? {},
        created_at: row.created_at
    })) ?? []);
};
export const fetchRakeLedger = async (marketId) => {
    const { data, error } = await supabase
        .from("market_rake_ledger")
        .select("id, amount, meta, created_at, pool_id")
        .eq("market_id", marketId)
        .order("created_at", { ascending: false });
    if (error)
        throw error;
    return (data?.map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        meta: row.meta ?? {},
        created_at: row.created_at,
        pool_id: row.pool_id
    })) ?? []);
};
export const updatePoolCopy = async (poolId, updates) => {
    const { error } = await supabase
        .from("markets")
        .update(updates)
        .eq("id", poolId);
    if (error)
        throw error;
};
