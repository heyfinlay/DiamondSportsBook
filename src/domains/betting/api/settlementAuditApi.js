import { supabase } from "@lib/supabaseClient";
/**
 * Fetch all payouts for a specific pool/market.
 * Requires sportsbook_admin or betting_admin permission.
 */
export async function fetchPoolPayouts(poolId) {
    const { data, error } = await supabase.rpc("settlement_get_pool_payouts", {
        p_pool_id: poolId
    });
    if (error) {
        throw new Error(`Failed to fetch pool payouts: ${error.message}`);
    }
    return data || [];
}
/**
 * Fetch payout history for a user.
 * Users can fetch their own; admins can fetch anyone's.
 */
export async function fetchUserPayouts(userId, limit = 25) {
    const { data, error } = await supabase.rpc("settlement_get_user_payouts", {
        p_user_id: userId || null,
        p_limit: limit
    });
    if (error) {
        throw new Error(`Failed to fetch user payouts: ${error.message}`);
    }
    return data || [];
}
/**
 * Fetch recent settlements (from pending_settlements table).
 * Requires admin permission.
 */
export async function fetchRecentSettlements(limit = 25) {
    const { data, error } = await supabase
        .from("pending_settlements")
        .select(`
      id,
      pool_id,
      winning_outcome_id,
      approved_at,
      approved_by,
      handle,
      rake_amount,
      distribution_pool,
      payout_per_unit,
      summary,
      markets:pool_id(
        name,
        total_pool,
        event_id
      ),
      events:market_container_id(
        title
      ),
      outcomes:winning_outcome_id(
        label
      )
    `)
        .eq("status", "settled")
        .order("approved_at", { ascending: false })
        .limit(limit);
    if (error) {
        throw new Error(`Failed to fetch recent settlements: ${error.message}`);
    }
    return data || [];
}
/**
 * Fetch raw payout audit records for a pool.
 * Alternative to the RPC, useful for custom filtering.
 */
export async function fetchSettlementPayoutsRaw(poolId) {
    const { data, error } = await supabase
        .from("settlement_payouts")
        .select(`
      *,
      profiles:user_id(display_name, username),
      outcomes:outcome_id(label)
    `)
        .eq("pool_id", poolId)
        .order("payout", { ascending: false });
    if (error) {
        throw new Error(`Failed to fetch settlement payouts: ${error.message}`);
    }
    return data || [];
}
export async function fetchSettlementSummary(poolId) {
    const { data, error } = await supabase
        .from("pending_settlements")
        .select(`
      pool_id,
      handle,
      rake_amount,
      distribution_pool,
      payout_per_unit,
      approved_at,
      approved_by,
      winning_outcome_id,
      outcomes:winning_outcome_id(label)
    `)
        .eq("pool_id", poolId)
        .eq("status", "settled")
        .maybeSingle();
    if (error) {
        throw new Error(`Failed to fetch settlement summary: ${error.message}`);
    }
    return data || null;
}
export async function fetchPoolSettlementLedger(poolId) {
    const { data, error } = await supabase.rpc("settlement_get_pool_ledger", {
        p_pool_id: poolId
    });
    if (error) {
        throw new Error(`Failed to fetch settlement ledger: ${error.message}`);
    }
    return (data?.map((row) => ({
        wager_id: row.wager_id,
        user_id: row.user_id,
        character_name: row.character_name ?? null,
        username: row.username ?? null,
        outcome_id: row.outcome_id,
        outcome_label: row.outcome_label ?? "Outcome",
        stake: Number(row.stake ?? 0),
        status: row.status ?? "pending",
        effective_odds: Number(row.effective_odds ?? 0),
        payout: Number(row.payout ?? 0),
        share_percent: Number(row.share_percent ?? 0),
        settled_at: row.settled_at ?? row.placed_at,
        placed_at: row.placed_at ?? row.settled_at ?? new Date().toISOString(),
        distribution_pool: Number(row.distribution_pool ?? 0),
        total_winning_stake: Number(row.total_winning_stake ?? 0),
        payout_per_unit: Number(row.payout_per_unit ?? 0)
    })) ?? []);
}
