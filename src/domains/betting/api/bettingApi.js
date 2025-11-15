import { supabase } from "@lib/supabaseClient";
export const fetchMarkets = async () => {
    const { data, error } = await supabase
        .from("markets")
        .select("id, name, description, status, total_pool, event:events(id, title, takeout)")
        .order("created_at", { ascending: false });
    if (error)
        throw error;
    return (data?.map((market) => ({
        id: market.id,
        name: market.name,
        description: market.description,
        status: market.status,
        total_pool: Number(market.total_pool),
        event: {
            id: extractSingle(market.event)?.id,
            title: extractSingle(market.event)?.title,
            takeout: Number(extractSingle(market.event)?.takeout ?? 0)
        }
    })) ?? []);
};
export const fetchMarketDetail = async (marketId) => {
    const { data, error } = await supabase
        .from("markets")
        .select("*, event:events(*)")
        .eq("id", marketId)
        .single();
    if (error)
        throw error;
    const { data: outcomes, error: outcomesError } = await supabase
        .from("outcomes")
        .select("*")
        .eq("market_id", marketId);
    if (outcomesError)
        throw outcomesError;
    return {
        market: {
            id: data.id,
            name: data.name,
            description: data.description,
            status: data.status,
            total_pool: Number(data.total_pool),
            min_stake: Number(data.min_stake),
            max_stake: Number(data.max_stake),
            event: extractSingle(data.event)
        },
        outcomes: outcomes?.map((outcome) => ({
            id: outcome.id,
            label: outcome.label,
            pool: Number(outcome.pool)
        })) ?? []
    };
};
export const previewWager = async (marketId, outcomeId, stake) => {
    const { data, error } = await supabase.rpc("betting_preview_wager", {
        p_market_id: marketId,
        p_outcome_id: outcomeId,
        p_stake: stake
    });
    if (error)
        throw error;
    return {
        baselineOdds: Number(data?.baseline_odds ?? 0),
        effectiveOdds: Number(data?.effective_odds ?? 0),
        priceImpact: Number(data?.price_impact ?? 0),
        impliedProbability: Number(data?.implied_probability ?? 0),
        estimatedPayout: Number(data?.estimated_payout ?? 0)
    };
};
export const placeWager = async (marketId, outcomeId, stake, idempotencyKey) => {
    const { data, error } = await supabase.rpc("betting_place_wager", {
        p_market_id: marketId,
        p_outcome_id: outcomeId,
        p_stake: stake,
        p_idempotency_key: idempotencyKey ?? null
    });
    if (error)
        throw error;
    return data;
};
const extractSingle = (value) => {
    if (!value)
        return null;
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value;
};
