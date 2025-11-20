# Account Page "My Wagers" Fix

## Summary

Fixed the "My Wagers" section on the `/account` page which was previously showing "No wagers yet" even when users had placed bets. The issue was caused by an incorrect field reference in the database query (`market.type` instead of `market.pool_type`), which was causing the query to fail silently.

## Problem

The `/account` page has a "My Wagers" column that was always showing "No wagers yet", even when:
- Users had placed multiple bets
- The wallet ledger showed debit entries for wagers
- Individual market detail pages showed "My Wagers" correctly for that specific market

## Root Cause

The `fetchUserWagers` function in `src/domains/betting/api/bettingApi.ts` was querying a non-existent field:
- Query was using `market.type`
- The correct field is `market.pool_type` (based on the database schema)

This caused the Supabase query to fail, returning an empty array instead of the user's wagers.

## Changes Made

### 1. Updated UserWager Interface

**File:** `src/domains/betting/api/bettingApi.ts` (lines 356-370)

**Before:**
```typescript
export interface UserWager {
  id: string;
  stake: number;
  status: string;
  effective_odds: number;
  created_at: string;
  outcome_label: string;
  market_name: string;
  market_type: string;
  event_title: string;
}
```

**After:**
```typescript
export interface UserWager {
  id: string;
  market_id: string;        // NEW - for navigation
  outcome_id: string;        // NEW - for tracking
  event_id: string;          // NEW - for reference
  stake: number;
  status: string;
  effective_odds: number;
  estimated_payout: number;  // NEW - show potential payout
  created_at: string;
  outcome_label: string;
  market_name: string;
  market_type: string;       // Now correctly populated
  event_title: string;
}
```

### 2. Fixed fetchUserWagers Query

**File:** `src/domains/betting/api/bettingApi.ts` (lines 372-419)

**Key Changes:**
- Changed `market.type` → `market.pool_type` ✓
- Added `market_id` to select fields for navigation
- Added `estimated_payout` to show potential winnings
- Added `outcome.id`, `market.id`, `event.id` for complete tracking

**Query:**
```typescript
.select(`
  id,
  market_id,
  stake,
  status,
  effective_odds,
  estimated_payout,
  created_at,
  outcome:outcomes(id, label),
  market:markets(
    id,
    name,
    pool_type,           // FIXED: was "type"
    event:events(id, title)
  )
`)
```

### 3. Enhanced Account Page UI

**File:** `src/app/account/AccountPage.tsx` (lines 421-468)

**Improvements:**

1. **Status Badge with Color Coding:**
   - Won: Green background (`bg-emerald-500/20 text-emerald-300`)
   - Lost: Red background (`bg-red-500/20 text-red-300`)
   - Refunded: Yellow background (`bg-yellow-500/20 text-yellow-300`)
   - Pending: Blue background (`bg-blue-500/20 text-blue-300`)

2. **Better Information Hierarchy:**
   - Event title displayed prominently
   - Market name shown separately for clarity
   - Stake and selection on main line
   - Odds and potential payout on detail line

3. **"View Market" Link:**
   - Each wager now has a clickable "View →" link
   - Links directly to `/market/${wager.market_id}`
   - Allows users to check market status and see full details

4. **Enhanced Data Display:**
   - Shows `estimated_payout` (potential winnings)
   - Properly formats `market_type` (e.g., "fastest_lap" → "Fastest Lap")
   - Displays placed timestamp in locale format

**Before:**
```tsx
<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
  <span>{wager.market_type || "Market"}</span>
  <span>{formatStatus(wager.status)}</span>
</div>
<p className="mt-1 text-base font-semibold">
  Ɖ{wager.stake.toFixed(2)} on {wager.outcome_label}
</p>
<p className="text-xs text-white/60">
  {wager.market_name} · {wager.event_title}
</p>
<p className="text-xs text-white/60">
  Odds {wager.effective_odds.toFixed(2)} · {new Date(wager.created_at).toLocaleString()}
</p>
```

**After:**
```tsx
<div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
  <span className="capitalize">{wager.market_type.replace(/_/g, " ")}</span>
  <span className={`rounded-full px-2 py-0.5 ${
    wager.status === "won" ? "bg-emerald-500/20 text-emerald-300" :
    wager.status === "lost" ? "bg-red-500/20 text-red-300" :
    wager.status === "refunded" ? "bg-yellow-500/20 text-yellow-300" :
    "bg-blue-500/20 text-blue-300"
  }`}>
    {formatStatus(wager.status)}
  </span>
</div>
<p className="mt-2 text-base font-semibold">
  Ɖ{wager.stake.toFixed(2)} on {wager.outcome_label}
</p>
<p className="text-xs text-white/60">
  {wager.event_title}
</p>
<p className="mt-1 text-xs text-white/60">
  {wager.market_name}
</p>
<div className="mt-2 flex items-center justify-between">
  <div className="text-xs text-white/60">
    <span>Odds {wager.effective_odds.toFixed(2)}</span>
    <span className="mx-1">·</span>
    <span>Potential Ɖ{wager.estimated_payout.toFixed(2)}</span>
  </div>
  <a
    href={`/market/${wager.market_id}`}
    className="text-xs font-semibold uppercase tracking-[0.3em] text-brand transition hover:text-white"
  >
    View →
  </a>
</div>
<p className="mt-1 text-xs text-white/50">
  {new Date(wager.created_at).toLocaleString()}
</p>
```

## Database Schema (Reference)

### Tables Involved

**wagers table:**
```sql
CREATE TABLE public.wagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES public.outcomes(id),
  stake numeric(14,2) NOT NULL,
  status public.wager_status NOT NULL DEFAULT 'pending',
  baseline_odds numeric(10,4) NOT NULL,
  effective_odds numeric(10,4) NOT NULL,
  price_impact numeric(10,6),
  estimated_payout numeric(14,2),
  settled_payout numeric(14,2),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**markets table (relevant fields):**
```sql
CREATE TABLE public.markets (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id),
  name text NOT NULL,
  pool_type text NOT NULL DEFAULT 'winner',  -- THIS is the correct field
  -- NOTE: No "type" field exists
  ...
);
```

## RLS (Row Level Security)

The existing RLS policies on the `wagers` table already ensure users can only see their own wagers:
- The query uses `user_id` filter in the WHERE clause
- Supabase RLS enforces that `user_id = auth.uid()`

No RLS changes were needed.

## Testing

### Before Fix:
- Navigate to `/account`
- "My Wagers" section shows: "No wagers yet. Select a market to place your first bet."
- Even when wallet ledger shows multiple "wager" debits

### After Fix:
- Navigate to `/account`
- "My Wagers" section shows all user wagers with:
  - ✅ Event name
  - ✅ Market/Pool name
  - ✅ Selection (outcome)
  - ✅ Stake amount
  - ✅ Locked odds
  - ✅ Potential payout
  - ✅ Status (Pending/Won/Lost/Refunded) with color coding
  - ✅ Placed timestamp
  - ✅ "View →" link to market detail page

### Verification Steps:
1. ✅ Use an account with existing wagers
2. ✅ Verify wagers appear in "My Wagers" section
3. ✅ Check status badges have correct colors
4. ✅ Click "View →" link - should navigate to correct market page
5. ✅ Verify odds and potential payout match what was locked at bet time
6. ✅ Compare with wallet ledger debits - amounts should align

## Files Modified

1. **`src/domains/betting/api/bettingApi.ts`**
   - Updated `UserWager` interface (lines 356-370)
   - Fixed `fetchUserWagers` query (lines 372-419)

2. **`src/app/account/AccountPage.tsx`**
   - Enhanced wager display UI (lines 421-468)
   - Added status color coding
   - Added "View Market" navigation link
   - Improved information layout

## Impact

### Positive:
- ✅ Users can now see all their wagers on `/account` page
- ✅ Status is clearly visible with color-coded badges
- ✅ Easy navigation back to markets via "View →" link
- ✅ Shows potential payout for pending bets
- ✅ Better alignment between ledger debits and visible wagers

### No Breaking Changes:
- Existing functionality preserved
- TypeScript compilation successful
- Build completes without errors
- No database migrations required (only query fix)

## Future Enhancements

Potential improvements for consideration:

1. **Filter/Sort Options:**
   - Filter by status (Pending, Won, Lost, Refunded)
   - Sort by date, stake amount, or potential payout

2. **Pagination:**
   - Currently shows last 20 wagers (default limit)
   - Could add "Load More" or pagination controls

3. **Summary Stats:**
   - Total wagered
   - Total won/lost
   - Win rate %

4. **Settled Payout Display:**
   - For won/lost bets, show actual settled payout amount
   - Currently only shows `estimated_payout`

---

**Status:** ✅ Complete and tested
**Build:** ✅ TypeScript compilation successful
**Deployment:** Ready for production
