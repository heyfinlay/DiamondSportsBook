import { getTeamColor } from "../teamColors";
import { getTeamCode } from "../teamCodes";
import { getMarketCloseLabel } from "../utils/closeTime";
const statusMap = {
    open: "open",
    closing_soon: "closing_soon",
    closed: "closed",
    settled: "settled",
    settlement_proposed: "settled",
    void: "closed",
    suspended: "closed"
};
const formatLastUpdated = (updatedAt) => {
    if (!updatedAt)
        return "—";
    const timestamp = new Date(updatedAt);
    if (Number.isNaN(timestamp.getTime()))
        return "—";
    const diffMs = Date.now() - timestamp.getTime();
    const minutes = Math.max(Math.round(diffMs / 60000), 0);
    if (minutes < 1)
        return "just now";
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
};
const computeOdds = (totalPool, outcomePool, rakeFraction) => {
    if (outcomePool <= 0)
        return 0;
    const rake = Math.max(0, Math.min(rakeFraction, 0.95));
    const distributable = totalPool * (1 - rake);
    const odds = distributable / outcomePool;
    return Number.isFinite(odds) ? odds : 0;
};
const getString = (value) => {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
};
const getOutcomeIdentity = (outcome) => {
    const meta = (outcome.metadata ?? {});
    const primaryLabel = getString(outcome.primaryLabel) ??
        getString(meta["participant_name"]) ??
        getString(meta["driver_name"]) ??
        getString(meta["fighter_name"]) ??
        getString(meta["team_name"]) ??
        outcome.label;
    const derivedSecondary = getString(outcome.secondaryLabel) ??
        getString(meta["secondary_label"]) ??
        getString(meta["team_name"]);
    const secondaryLabel = derivedSecondary && derivedSecondary !== primaryLabel ? derivedSecondary : undefined;
    const accentColor = getString(outcome.accentColor) ??
        getString(meta["team_color"]) ??
        outcome.color ??
        getTeamColor(secondaryLabel ?? primaryLabel);
    const shortLabel = getString(meta["short_label"]) ??
        getTeamCode(secondaryLabel ?? primaryLabel);
    const participantType = getString(outcome.participantType) ??
        getString(meta["participant_type"]) ??
        "custom";
    return {
        label: outcome.label,
        primaryLabel,
        secondaryLabel,
        accentColor,
        shortLabel,
        participantType
    };
};
const mapOutcomes = (totalStake, rakeFraction, outcomes) => outcomes.map((outcome) => {
    const staked = Number(outcome.pool ?? 0);
    const providedOdds = outcome.baselineOdds ?? null;
    const identity = getOutcomeIdentity(outcome);
    const odds = typeof providedOdds === "number" && providedOdds > 0
        ? providedOdds
        : computeOdds(totalStake, staked, rakeFraction);
    return {
        id: outcome.id,
        label: identity.label,
        primaryLabel: identity.primaryLabel,
        secondaryLabel: identity.secondaryLabel,
        accentColor: identity.accentColor,
        shortLabel: identity.shortLabel,
        participantType: identity.participantType,
        marketShare: totalStake > 0 ? staked / totalStake : 0,
        baselineOdds: odds,
        numBets: outcome.numBets ?? 0,
        diamondsStaked: staked,
        trendDelta: 0
    };
});
const buildPool = ({ id, name, status, totalStake, closeTime, updatedAt, activityAt, totalBets = 0, rakeFraction, outcomes }) => {
    const baseStatus = statusMap[status] ?? "open";
    const closesSoon = baseStatus === "open" &&
        closeTime &&
        new Date(closeTime).getTime() - Date.now() < 15 * 60 * 1000 &&
        new Date(closeTime).getTime() > Date.now();
    const uiStatus = closesSoon ? "closing_soon" : baseStatus;
    return {
        id,
        title: name,
        eventTitle: null,
        categoryLabel: null,
        sportCode: null,
        status: uiStatus,
        totalStake,
        totalBets,
        closeAt: closeTime ?? null,
        timeRemainingLabel: getMarketCloseLabel(closeTime ?? null),
        rakePercent: Math.max(rakeFraction, 0) * 100,
        lastUpdatedLabel: formatLastUpdated(activityAt ?? updatedAt),
        outcomes: mapOutcomes(totalStake, rakeFraction, outcomes)
    };
};
export const mapEventWithMarketsToUiPools = (events) => {
    const pools = [];
    events.forEach((event) => {
        const rakeFraction = Number(event.takeout ?? 0);
        event.markets
            .filter((market) => !market.archived &&
            ["open", "closed", "settled", "settlement_proposed"].includes(market.status))
            .forEach((market) => {
            const pool = buildPool({
                id: market.id,
                name: market.name,
                status: market.status,
                totalStake: Number(market.total_pool ?? 0),
                closeTime: market.close_time ?? undefined,
                updatedAt: market.settled_at ?? undefined,
                activityAt: market.settled_at ?? undefined,
                totalBets: 0,
                rakeFraction,
                outcomes: market.outcomes?.map((outcome) => {
                    const meta = (outcome.metadata ?? {});
                    return {
                        id: outcome.id,
                        label: outcome.label,
                        pool: Number(outcome.pool ?? 0),
                        primaryLabel: getString(meta["participant_name"]) ??
                            getString(meta["driver_name"]) ??
                            getString(meta["fighter_name"]) ??
                            getString(meta["team_name"]) ??
                            outcome.label,
                        secondaryLabel: getString(meta["secondary_label"]) ??
                            getString(meta["team_name"]),
                        accentColor: getString(meta["team_color"]) ??
                            outcome.color ??
                            getTeamColor(getString(meta["team_name"]) ?? outcome.label),
                        participantType: getString(meta["participant_type"]),
                        metadata: outcome.metadata ?? null
                    };
                }) ?? []
            });
            pool.eventTitle = event.title;
            pools.push(pool);
        });
    });
    return pools;
};
const groupPricingRows = (rows) => {
    const grouped = new Map();
    rows.forEach((row) => {
        if (!row.pool_id || !row.outcome_id)
            return;
        if (!grouped.has(row.pool_id)) {
            grouped.set(row.pool_id, {
                meta: {
                    id: row.pool_id,
                    name: row.pool_name,
                    status: row.pool_status,
                    totalStake: Number(row.total_stake ?? 0),
                    totalBets: Number(row.total_bets ?? 0),
                    closeTime: row.close_time,
                    updatedAt: row.updated_at,
                    lastActivityAt: row.last_activity_at,
                    rakeFraction: Number(row.rake_percent ?? 0)
                },
                outcomes: []
            });
        }
        grouped.get(row.pool_id).outcomes.push({
            id: row.outcome_id,
            label: row.outcome_label,
            pool: Number(row.outcome_stake ?? 0),
            primaryLabel: row.driver_name ?? row.team_name ?? row.outcome_label,
            secondaryLabel: row.team_name ?? null,
            accentColor: row.team_color ?? getTeamColor(row.team_name ?? row.outcome_label),
            participantType: row.driver_name ? "driver" : "team",
            numBets: Number(row.outcome_bets ?? 0),
            baselineOdds: row.baseline_odds ? Number(row.baseline_odds) : null
        });
    });
    return grouped;
};
export const mapPricingRowsToPools = (rows) => {
    const grouped = Array.from(groupPricingRows(rows).values()).sort((a, b) => {
        const aClose = a.meta.closeTime ? new Date(a.meta.closeTime).getTime() : Number.POSITIVE_INFINITY;
        const bClose = b.meta.closeTime ? new Date(b.meta.closeTime).getTime() : Number.POSITIVE_INFINITY;
        return aClose - bClose;
    });
    return grouped.map(({ meta, outcomes }) => buildPool({
        id: meta.id,
        name: meta.name,
        status: meta.status,
        totalStake: meta.totalStake,
        totalBets: meta.totalBets,
        closeTime: meta.closeTime,
        updatedAt: meta.updatedAt,
        activityAt: meta.lastActivityAt,
        rakeFraction: meta.rakeFraction,
        outcomes
    }));
};
export const mapPricingRowsToPool = (rows) => {
    if (!rows.length)
        return null;
    const grouped = groupPricingRows(rows);
    const first = grouped.values().next().value;
    if (!first)
        return null;
    return buildPool({
        id: first.meta.id,
        name: first.meta.name,
        status: first.meta.status,
        totalStake: first.meta.totalStake,
        totalBets: first.meta.totalBets,
        closeTime: first.meta.closeTime,
        updatedAt: first.meta.updatedAt,
        activityAt: first.meta.lastActivityAt,
        rakeFraction: first.meta.rakeFraction,
        outcomes: first.outcomes
    });
};
export const mapMarketDetailToUiPool = (detail) => {
    if (!detail?.market)
        return null;
    const { market, outcomes } = detail;
    const totalStake = Number(market.total_pool ?? 0);
    const rakeFraction = Number(market.rake_percent ?? market.event?.takeout ?? 0);
    const enrichedOutcomes = outcomes?.map((outcome) => {
        const meta = (outcome.metadata ?? {});
        return {
            ...outcome,
            label: outcome.label,
            primaryLabel: outcome.primaryLabel ??
                getString(meta["participant_name"]) ??
                getString(meta["driver_name"]) ??
                getString(meta["fighter_name"]) ??
                getString(meta["team_name"]) ??
                outcome.label,
            secondaryLabel: outcome.secondaryLabel ??
                getString(meta["secondary_label"]) ??
                getString(meta["team_name"]),
            accentColor: outcome.accentColor ??
                getString(meta["team_color"]) ??
                outcome.color ??
                undefined,
            participantType: outcome.participantType ??
                getString(meta["participant_type"]) ??
                null
        };
    }) ?? [];
    return buildPool({
        id: market.id,
        name: market.name,
        status: market.status,
        totalStake,
        closeTime: market.close_time ?? undefined,
        updatedAt: market.updated_at ?? market.settled_at ?? undefined,
        activityAt: market.updated_at ?? market.settled_at ?? undefined,
        totalBets: 0,
        rakeFraction,
        outcomes: enrichedOutcomes
    });
};
