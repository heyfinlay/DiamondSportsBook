import { supabase } from "@lib/supabaseClient";

export interface PoolPayout {
  payout_id: string;
  wager_id: string;
  user_id: string;
  user_display_name: string | null;
  outcome_label: string;
  stake: number;
  payout: number;
  effective_odds: number;
  share_percent: number;
  wallet_tx_id: string | null;
  settled_at: string;
}

export interface UserPayout {
  payout_id: string;
  wager_id: string;
  event_title: string;
  pool_name: string;
  outcome_label: string;
  stake: number;
  payout: number;
  effective_odds: number;
  settled_at: string;
}

/**
 * Fetch all payouts for a specific pool/market.
 * Requires sportsbook_admin or betting_admin permission.
 */
export async function fetchPoolPayouts(poolId: string): Promise<PoolPayout[]> {
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
export async function fetchUserPayouts(
  userId?: string,
  limit: number = 25
): Promise<UserPayout[]> {
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
export async function fetchRecentSettlements(limit: number = 25) {
  const { data, error } = await supabase
    .from("pending_settlements")
    .select(
      `
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
    `
    )
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
export async function fetchSettlementPayoutsRaw(poolId: string) {
  const { data, error } = await supabase
    .from("settlement_payouts")
    .select(
      `
      *,
      profiles:user_id(display_name, username),
      outcomes:outcome_id(label)
    `
    )
    .eq("pool_id", poolId)
    .order("payout", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch settlement payouts: ${error.message}`);
  }

  return data || [];
}
