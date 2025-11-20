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
export declare function fetchPoolPayouts(poolId: string): Promise<PoolPayout[]>;
/**
 * Fetch payout history for a user.
 * Users can fetch their own; admins can fetch anyone's.
 */
export declare function fetchUserPayouts(userId?: string, limit?: number): Promise<UserPayout[]>;
/**
 * Fetch recent settlements (from pending_settlements table).
 * Requires admin permission.
 */
export declare function fetchRecentSettlements(limit?: number): Promise<{
    id: any;
    pool_id: any;
    winning_outcome_id: any;
    approved_at: any;
    approved_by: any;
    handle: any;
    rake_amount: any;
    distribution_pool: any;
    payout_per_unit: any;
    summary: any;
    markets: {
        name: any;
        total_pool: any;
        event_id: any;
    }[];
    events: {
        title: any;
    }[];
    outcomes: {
        label: any;
    }[];
}[]>;
/**
 * Fetch raw payout audit records for a pool.
 * Alternative to the RPC, useful for custom filtering.
 */
export declare function fetchSettlementPayoutsRaw(poolId: string): Promise<any[]>;
