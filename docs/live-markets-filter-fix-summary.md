# Live Markets Page Filter Fix - Summary

## Problem

The Live Markets page was showing **all events** from the database, even if all their markets were settled, archived, or closed. This meant events with no active betting opportunities would still appear on the page with empty market cards.

## Root Cause

The `fetchMarketEvents` function in [src/domains/betting/api/bettingApi.ts:142-148](src/domains/betting/api/bettingApi.ts#L142-L148) already filters markets to only include those with:
- `archived = false`
- `status IN ('open', 'closed')`

However, **events** themselves were not filtered based on whether they had any markets after this filtering. So an event with all markets `settled` or `archived` would still appear on the page with an empty `markets` array.

## Solution

### Client-Side Filtering

Added a filter in [src/app/markets/MarketsPage.tsx:83-86](src/app/markets/MarketsPage.tsx#L83-L86) to remove events with no active markets:

```typescript
// Filter to only show events with at least one active market
const eventsWithActiveMarkets = eventsQuery.data?.filter(
  (event) => event.markets.length > 0
) ?? [];

const hasEvents = eventsWithActiveMarkets.length > 0;
```

This ensures that:
1. Events with no markets after the backend filter are excluded
2. Only events with at least one `open` or `closed` (non-archived) market appear on the page
3. The "no events" placeholder only shows when there are truly no active markets

### Copy Updates

Updated the header and "How It Works" box per requirements:

**Header subtext** ([Line 99-101](src/app/markets/MarketsPage.tsx#L99-L101)):
- **Before:** "All DBGP betting uses a live parimutuel system. Your payout depends on the total Diamonds staked across each outcome, and odds will continue shifting until the market closes and locks your final price."
- **After:** "All DBGP betting uses a live parimutuel system. Your payout depends on the total Diamonds staked across each outcome."

**How It Works box** ([Line 106-108](src/app/markets/MarketsPage.tsx#L106-L108)):
- **Before:** "Markets update in real-time as Diamonds move across the pool. Odds and payout estimates rise or fall every few seconds. Your final odds are locked only when the market closes."
- **After:** "Markets update in real time as Diamonds move across the pool. Odds and payout estimates will rise or fall until the market closes and locks your final price."

## Market Status Values

For reference, the `market_status` enum includes:
- `'draft'` - Not yet visible to users
- `'open'` - **Active** - Users can place bets
- `'suspended'` - Temporarily paused
- `'closed'` - **Active** - No new bets, awaiting settlement
- `'settled'` - **Excluded** - Payouts distributed
- `'settlement_proposed'` - In settlement process
- `'void'` - Cancelled/invalidated

The frontend filter shows only markets with `status IN ('open', 'closed')` and `archived = false`.

## Testing

### Test Case 1: Event with Active Markets
**Setup:**
- Event: "Monaco Street Circuit"
- Markets: 1 open, 1 closed
- **Expected:** Event appears on Live Markets page with both markets visible

### Test Case 2: Event with All Settled/Archived Markets
**Setup:**
- Event: "Del Perro GP Market"
- Markets: All `status = 'settled'` or `archived = true`
- **Expected:** Event does NOT appear on Live Markets page

### Test Case 3: Event with Mixed Markets
**Setup:**
- Event: "Silverstone Grand Prix"
- Markets: 2 open, 3 settled
- **Expected:** Event appears with only the 2 open markets visible

### Test Case 4: No Active Markets Anywhere
**Setup:**
- All events have only settled/archived markets
- **Expected:** "Live market board coming online" placeholder shows

## Files Modified

| File | Change |
|------|--------|
| [src/app/markets/MarketsPage.tsx](src/app/markets/MarketsPage.tsx) | Added client-side filter for events with active markets; updated header and "How It Works" copy |

## Why Client-Side vs Backend?

We chose client-side filtering because:

1. **Existing backend filter is correct** - The `fetchMarketEvents` function already filters markets properly. The issue is just that events with empty market arrays still render.

2. **Simple fix** - One line of code to filter events: `event.markets.length > 0`

3. **No RLS complexity** - Avoids creating a new view/RPC that requires RLS policies and grants

4. **Performance acceptable** - The query returns all events anyway; filtering a dozen events client-side is negligible

5. **Maintains flexibility** - If we later need to show "upcoming events" or other states, the backend query structure is unchanged

### Alternative: Backend View/RPC

If we needed to optimize for hundreds of events, we could create:

```sql
CREATE VIEW public.live_market_events AS
SELECT
  e.*,
  jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'name', m.name,
      'status', m.status,
      ...
    ) ORDER BY m.created_at
  ) FILTER (
    WHERE m.archived = false
      AND m.status IN ('open', 'closed')
  ) AS markets
FROM public.events e
LEFT JOIN public.markets m ON m.event_id = e.id
GROUP BY e.id
HAVING count(m.id) FILTER (
  WHERE m.archived = false
    AND m.status IN ('open', 'closed')
) > 0;
```

But this adds complexity without current performance need.

## Related Documentation

- [Market Creation Fixes](./market-creation-fixes-summary.md)
- [CODEX Live Markets & Account Fixes](./codex-live-markets-account-fixes-summary.md)

---

## Status: ✅ Complete

The Live Markets page now:
- ✅ Shows only events with at least one active market
- ✅ Hides events with all markets settled/archived
- ✅ Displays updated copy per requirements
- ✅ Maintains existing market filtering logic
