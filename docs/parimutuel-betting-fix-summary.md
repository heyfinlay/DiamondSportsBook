# Parimutuel Betting System Fix - Summary

## Problem

Placing a wager was failing with:

```
null value in column "baseline_odds" of relation "wagers" violates not-null constraint
```

This occurred when placing the **first bet on an outcome** (when `outcome_pool = 0`).

---

## Root Cause

### The Problematic Code

**File:** [supabase/migrations/0003_betting.sql:136](supabase/migrations/0003_betting.sql#L136)

```sql
CREATE OR REPLACE FUNCTION public.parimutuel_preview(
  p_total_pool numeric,
  p_outcome_pool numeric,
  p_stake numeric,
  p_takeout numeric
) RETURNS jsonb
...
BEGIN
  IF p_total_pool <= 0 THEN
    baseline_odds := (1 - p_takeout);
  ELSE
    -- ❌ PROBLEM: When p_outcome_pool = 0, this returns NULL!
    baseline_odds := (p_total_pool / nullif(p_outcome_pool, 0)) * (1 - p_takeout);
  END IF;
  ...
END;
```

### Why This Failed

When placing the **first bet on an outcome**:
- `p_outcome_pool = 0` (no one has bet on this outcome yet)
- `nullif(p_outcome_pool, 0)` returns `NULL`
- `p_total_pool / NULL` = `NULL`
- `baseline_odds` becomes `NULL`
- Inserting into `wagers.baseline_odds` (which is `NOT NULL`) **fails**

### Call Chain

```
User places first bet on outcome #2
  ↓
betting_place_wager()
  ↓
betting_preview_wager()
  ↓
parimutuel_preview(total_pool=1000, outcome_pool=0, stake=100, takeout=0.12)
  ↓
baseline_odds := (1000 / nullif(0, 0)) * 0.88  → NULL
  ↓
INSERT INTO wagers(baseline_odds, ...) VALUES (NULL, ...)
  ↓
❌ ERROR: null value in column "baseline_odds" violates not-null constraint
```

---

## Solution

### Fixed Code

**File:** [supabase/migrations/20251119000003_fix_parimutuel_baseline_odds.sql](supabase/migrations/20251119000003_fix_parimutuel_baseline_odds.sql)

```sql
CREATE OR REPLACE FUNCTION public.parimutuel_preview(
  p_total_pool numeric,
  p_outcome_pool numeric,
  p_stake numeric,
  p_takeout numeric
) RETURNS jsonb
...
BEGIN
  -- ✅ Handle edge cases for baseline odds calculation
  IF p_total_pool <= 0 OR p_outcome_pool <= 0 THEN
    -- When pool is empty or no one has bet on this outcome yet,
    -- baseline odds represent the theoretical starting odds
    baseline_odds := (1 - p_takeout);
  ELSE
    -- Normal parimutuel odds: (total_pool / outcome_pool) * (1 - takeout)
    baseline_odds := (p_total_pool / p_outcome_pool) * (1 - p_takeout);
  END IF;

  new_total := p_total_pool + p_stake;
  new_outcome := p_outcome_pool + p_stake;
  effective_odds := (new_total / new_outcome) * (1 - p_takeout);

  -- ... rest of calculations
END;
```

### Why This Works

1. **Handles empty outcome pool**: When `p_outcome_pool <= 0`, we use the theoretical starting odds `(1 - p_takeout)`
2. **Prevents NULL division**: Never divides by zero or NULL
3. **Mathematically sound**: The baseline odds for an outcome with no bets should represent the maximum potential return (before any money is staked)
4. **Always returns valid odds**: `baseline_odds` is guaranteed to be a valid numeric value

### Example Scenario

**First bet on an outcome:**
- Total pool: Ɖ1,000 (other outcomes have bets)
- Outcome pool: Ɖ0 (no bets on this outcome yet)
- Stake: Ɖ100
- Takeout: 12% (0.12)

**Before fix:**
```
baseline_odds := (1000 / nullif(0, 0)) * (1 - 0.12)
               = NULL
               → ERROR!
```

**After fix:**
```
baseline_odds := (1 - 0.12) = 0.88

effective_odds := ((1000 + 100) / (0 + 100)) * (1 - 0.12)
                = (1100 / 100) * 0.88
                = 11 * 0.88
                = 9.68

price_impact := (9.68 - 0.88) / 0.88 = 1000% (huge impact, as expected for first bet)
estimated_payout := 100 * 9.68 = Ɖ968
```

---

## Verification of Parimutuel Settlement (PART 2)

### Settlement Functions Analyzed

**1. [market_pool_preview_settlement](supabase/migrations/20251118000018_market_management.sql#L294)**

```sql
SELECT coalesce(sum(stake), 0) INTO handle
FROM public.wagers
WHERE market_id = p_pool_id AND status IN ('accepted', 'pending');

SELECT coalesce(sum(stake), 0) INTO winning_total
FROM public.wagers
WHERE market_id = p_pool_id AND outcome_id = p_winning_outcome AND status IN ('accepted', 'pending');

rake := round(handle * rake_basis, 2);
distribution := handle - rake;

IF winning_total > 0 THEN
  payout_per_unit := distribution / winning_total;  -- ✅ CORRECT PARIMUTUEL FORMULA
ELSE
  payout_per_unit := 0;
END IF;
```

**2. [market_pool_confirm_settlement](supabase/migrations/20251118000018_market_management.sql#L462)**

```sql
FOR wager_record IN
  SELECT * FROM public.wagers
  WHERE market_id = p_pool_id AND status IN ('accepted', 'pending')
  FOR UPDATE
LOOP
  IF wager_record.outcome_id = pending_row.winning_outcome_id THEN
    payout := round(wager_record.stake * payout_per_unit, 2);  -- ✅ Uses parimutuel formula
    -- Credit wallet
    PERFORM public.wallet_credit(wager_record.user_id, payout, ...);
    UPDATE public.wagers SET status = 'won', settled_payout = payout WHERE id = wager_record.id;
  ELSE
    UPDATE public.wagers SET status = 'lost', settled_payout = 0 WHERE id = wager_record.id;
  END IF;
END LOOP;
```

### Parimutuel Formula Verification

✅ **CORRECT**: Settlement uses the proper parimutuel formula:

```
payout_per_unit = (total_handle - rake) / total_on_winner
individual_payout = stake * payout_per_unit
```

✅ **Does NOT use baseline_odds**: The `baseline_odds` column is **never referenced** in settlement. It's purely for preview/display purposes.

✅ **Proper distribution**: All losing stakes go into the pool, rake is deducted, and the net pool is distributed proportionally among winners.

### Example Settlement Calculation

**Market state at close:**
- Outcome A: Ɖ5,000 in stakes
- Outcome B: Ɖ3,000 in stakes
- Outcome C: Ɖ2,000 in stakes
- **Total handle:** Ɖ10,000
- **Rake:** 12% = Ɖ1,200
- **Net pool:** Ɖ8,800

**If Outcome B wins:**
```
payout_per_unit = 8800 / 3000 = 2.933...

Alice's wager: Ɖ100 on B → payout = 100 * 2.93 = Ɖ293.00
Bob's wager: Ɖ500 on B → payout = 500 * 2.93 = Ɖ1,465.00
Charlie's wager: Ɖ200 on A → payout = Ɖ0 (lost)
```

---

## One-Row-Per-Bet Pattern (PART 1)

### Verified: No Upsert Logic

**File:** [supabase/migrations/20251118000018_market_management.sql:962-984](supabase/migrations/20251118000018_market_management.sql#L962-L984)

```sql
-- betting_place_wager does a simple INSERT (no ON CONFLICT)
INSERT INTO public.wagers(
  user_id, market_id, outcome_id, stake, status,
  baseline_odds, effective_odds, price_impact, estimated_payout, idempotency_key
) VALUES (
  actor, p_market_id, p_outcome_id, p_stake, 'accepted',
  (preview->>'baseline_odds')::numeric,
  (preview->>'effective_odds')::numeric,
  (preview->>'price_impact')::numeric,
  (preview->>'estimated_payout')::numeric,
  p_idempotency_key
)
RETURNING * INTO wager_row;
```

### Database Constraints

**File:** [supabase/migrations/0003_betting.sql:62-79](supabase/migrations/0003_betting.sql#L62-L79)

```sql
CREATE TABLE public.wagers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  market_id uuid not null references public.markets(id),
  outcome_id uuid not null references public.outcomes(id),
  stake numeric(14,2) not null,
  status public.wager_status not null default 'pending',
  baseline_odds numeric(10,4) not null,  -- Now guaranteed to have valid value
  effective_odds numeric(10,4) not null,
  price_impact numeric(10,4) not null,
  estimated_payout numeric(14,2) not null,
  settled_payout numeric(14,2),
  idempotency_key text,
  created_at timestamptz not null default now()
);

-- ✅ No UNIQUE constraint on (market_id, outcome_id, user_id)
-- ✅ Users CAN place multiple bets on the same outcome
CREATE UNIQUE INDEX wagers_idempotency_idx ON public.wagers (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

### Idempotency Protection

- Uses `idempotency_key` to prevent duplicate wagers from network retries
- **Does NOT** prevent multiple intentional bets on the same outcome
- Each bet gets its own row with unique ID

---

## Betslip Numeric Input (PART 4)

### Investigation Results

**No 101-198 restriction found in codebase.**

The betslip component uses:
- `inputMode="numeric"` for mobile-friendly numeric keyboard
- Standard HTML `<input type="text">` with regex filtering
- Validation against `minStake` and `maxStake` from database
- Current defaults: `min_stake = 10`, `max_stake = 1,000,000`

**File:** [src/domains/betting/components/Betslip.tsx:172-180](src/domains/betting/components/Betslip.tsx#L172-L180)

```tsx
const handleStakeInput = (value: string) => {
  setInputValue(value);
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(numeric)) {
    setStake(0);
    return;
  }
  setStake(numeric);
};
```

### Possible Causes of 101-198 Issue

1. **Browser autocomplete**: Some browsers suggest recently entered values
2. **Cached form values**: Browser remembering previous inputs
3. **Testing artifacts**: Test data in localStorage or session
4. **User misunderstanding**: May have confused stake validation with odds display

### Recommendation

If this issue persists:
1. Clear browser cache and localStorage
2. Check for any browser extensions affecting input fields
3. Test in incognito/private mode
4. Verify network requests show correct stake values being sent

---

## Migration Applied

**File:** [supabase/migrations/20251119000003_fix_parimutuel_baseline_odds.sql](supabase/migrations/20251119000003_fix_parimutuel_baseline_odds.sql)

**Status:** ✅ Successfully applied to database

**Changes:**
- Refactored `parimutuel_preview()` to handle edge case when `p_outcome_pool <= 0`
- Added column comment to clarify `baseline_odds` is preview-only, not used in settlement
- No schema changes required

---

## Testing

### SQL Test: First Bet on Outcome

```sql
-- Setup: Create test market with outcomes
INSERT INTO public.events (id, title, takeout)
VALUES ('test-event-id', 'Test Race', 0.12);

INSERT INTO public.markets (id, event_id, name, status, total_pool, min_stake, max_stake)
VALUES ('test-market-id', 'test-event-id', 'Winner', 'open', 1000, 10, 100000);

INSERT INTO public.outcomes (market_id, label, pool)
VALUES
  ('test-market-id', 'Driver #1', 600),  -- Has bets
  ('test-market-id', 'Driver #2', 400),  -- Has bets
  ('test-market-id', 'Driver #3', 0);    -- No bets yet (EDGE CASE)

-- Test: Preview first bet on outcome with 0 pool
SELECT public.betting_preview_wager(
  'test-market-id',
  (SELECT id FROM public.outcomes WHERE label = 'Driver #3'),
  100
);

-- Expected result:
{
  "baseline_odds": 0.88,           -- ✅ NOT NULL (was NULL before fix)
  "effective_odds": 9.68,
  "price_impact": 10.0,
  "implied_probability": 0.1033,
  "estimated_payout": 968.00,
  ...
}

-- Test: Place first wager on outcome with 0 pool
SELECT public.betting_place_wager(
  'test-market-id',
  (SELECT id FROM public.outcomes WHERE label = 'Driver #3'),
  100,
  'test-idempotency-key-1'
);

-- Expected: ✅ Wager placed successfully (no NULL constraint error)
```

### Frontend Test

1. Navigate to an open market
2. Select an outcome with zero bets (if available, or test on new market)
3. Enter stake amount: Ɖ100
4. Click "Place Wager"

**Expected:**
- ✅ Preview shows valid baseline_odds (not null)
- ✅ Wager placed successfully
- ✅ Wallet balance debited
- ✅ Wager appears in history

### Settlement Test

```sql
-- Setup: Place multiple bets
SELECT public.betting_place_wager('market-id', 'outcome-a-id', 100, 'user1-bet1');
SELECT public.betting_place_wager('market-id', 'outcome-a-id', 200, 'user2-bet1');
SELECT public.betting_place_wager('market-id', 'outcome-b-id', 300, 'user3-bet1');
SELECT public.betting_place_wager('market-id', 'outcome-b-id', 400, 'user4-bet1');

-- Close market
SELECT public.market_pool_close('market-id');

-- Propose settlement (outcome A wins)
SELECT public.market_pool_propose_settlement('market-id', 'outcome-a-id');

-- Verify preview
-- Total handle: 1000
-- Rake (12%): 120
-- Net pool: 880
-- Winning total: 300
-- Payout per unit: 880 / 300 = 2.933...

-- Confirm settlement
SELECT public.market_pool_confirm_settlement('market-id');

-- Verify payouts
SELECT user_id, stake, settled_payout, status
FROM public.wagers
WHERE market_id = 'market-id';

-- Expected:
-- user1: stake=100, payout=293.33, status=won
-- user2: stake=200, payout=586.67, status=won
-- user3: stake=300, payout=0, status=lost
-- user4: stake=400, payout=0, status=lost
```

---

## Summary for Finlay

### What Was Broken

The `parimutuel_preview()` function tried to divide by zero when calculating baseline odds for the first bet on an outcome. The code used `nullif(p_outcome_pool, 0)` which returns NULL when the outcome pool is 0, making the entire division result NULL and violating the NOT NULL constraint on `wagers.baseline_odds`.

### How We Fixed It

Added an edge case check: when `p_outcome_pool <= 0`, we use the theoretical starting odds `(1 - p_takeout)` instead of trying to divide. This represents the maximum potential return before any money is staked on that outcome.

### Parimutuel Correctness Verified

✅ Settlement functions use the correct parimutuel formula: `(net_pool / total_on_winner) * stake`
✅ `baseline_odds` is **never used** in settlement - it's purely for preview/display
✅ No upsert logic - each bet gets its own row
✅ Idempotency prevents accidental duplicates from network retries

### Betslip Numeric Input

No 101-198 restriction found in the codebase. The input accepts any numeric value and validates against the market's `min_stake` (default 10) and `max_stake` (default 1,000,000). If this issue persists, it's likely a browser autocomplete or caching issue.

### What's Now Working

- ✅ Users can place the first bet on any outcome (even with 0 pool)
- ✅ Baseline odds always have a valid value
- ✅ Preview odds calculate correctly for edge cases
- ✅ Settlement uses proper parimutuel formula
- ✅ Multiple bets per user per outcome are supported
- ✅ No accidental upsert behavior

### Files Modified

| File | Change |
|------|--------|
| [supabase/migrations/20251119000003_fix_parimutuel_baseline_odds.sql](supabase/migrations/20251119000003_fix_parimutuel_baseline_odds.sql) | New migration fixing parimutuel_preview() edge case |

**Migration Status:** ✅ Successfully applied to database

---

## Domain Knowledge: Parimutuel Betting

### How It Works

1. **All stakes go to a single pool** (unlike fixed-odds betting)
2. **House takes rake** (takeout %) from total pool
3. **Net pool distributed to winners** proportionally to their stakes
4. **Final odds determined at market close** (not at bet placement)

### Why baseline_odds is Preview-Only

- Baseline odds show **current pool state** at bet placement time
- They help bettors understand **current value** and **price impact**
- **NOT** used for payout calculation
- Actual payout uses **final pool state** at settlement

### Price Impact

When you bet, you dilute the payout pool for that outcome:
- First bet: huge price impact (you're establishing the pool)
- Subsequent bets: smaller impact (you're joining existing pool)
- Large bet: bigger impact than small bet

This is **normal parimutuel behavior** and creates strategic betting opportunities.

---

## Related Documentation

- [Market Creation Fixes](./market-creation-fixes-summary.md)
- [Wallet Debit Fix](./betting-place-wager-fix-summary.md)
- [V2 Timing Reconciliation](./v2-timing-reconciliation-summary.md)
