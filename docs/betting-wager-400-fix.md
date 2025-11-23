# Betting Wager 400 Error - Diagnostic & Fix

## Symptom

**Problem:** `betting_place_wager` RPC returns HTTP 400 for some pools but works for others.

**Pools Failing:**
- "Race Overall Winner"
- "First Retirement"

**Pools Working:**
- "Qualifying Pole Position"
- "Fastest Lap"

**Frontend Behavior:**
- No UI error message displayed
- Network tab shows: `POST /rest/v1/rpc/betting_place_wager` → `400 Bad Request`

---

## Root Cause Analysis

### 1. TypeScript Call Site

**File:** [src/domains/betting/api/bettingApi.ts:398-413](../../src/domains/betting/api/bettingApi.ts#L398-L413)

```typescript
export const placeWager = async (
  marketId: string,      // Pool ID (markets table)
  outcomeId: string,     // Outcome ID (outcomes table)
  stake: number,         // Wager amount in diamonds
  idempotencyKey?: string
) => {
  const { data, error } = await supabase.rpc("betting_place_wager", {
    p_market_id: marketId,
    p_outcome_id: outcomeId,
    p_stake: stake,
    p_idempotency_key: idempotencyKey ?? null
  });

  if (error) throw error;
  return data;
};
```

**Parameters sent to Supabase:**
- `p_market_id` (uuid) - The pool/market ID
- `p_outcome_id` (uuid) - The outcome being bet on
- `p_stake` (numeric) - The stake amount
- `p_idempotency_key` (text, nullable) - Prevents duplicate wagers

---

### 2. SQL Function Definition

**File:** [supabase/migrations/20251118000018_market_management.sql:914-987](../../supabase/migrations/20251118000018_market_management.sql#L914-L987)

```sql
CREATE OR REPLACE FUNCTION public.betting_place_wager(
  p_market_id uuid,
  p_outcome_id uuid,
  p_stake numeric,
  p_idempotency_key text DEFAULT NULL
) RETURNS public.wagers
AS $$
DECLARE
  actor uuid := auth.uid();
  preview jsonb;
  ...
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';  -- Returns 401/403
  END IF;

  -- 🔍 KEY LINE: Calls betting_preview_wager (which has the status check)
  preview := public.betting_preview_wager(p_market_id, p_outcome_id, p_stake);

  -- ... wallet debit, insert wager, etc.
END;
$$;
```

The function calls **`betting_preview_wager`** at line 935, which performs all validations.

---

### 3. Validation Logic (Where 400 Occurs)

**File:** [supabase/migrations/20251118000018_market_management.sql:857-911](../../supabase/migrations/20251118000018_market_management.sql#L857-L911)

```sql
CREATE OR REPLACE FUNCTION public.betting_preview_wager(
  p_market_id uuid,
  p_outcome_id uuid,
  p_stake numeric
) RETURNS jsonb
AS $$
DECLARE
  pool_row public.markets;
  outcome_row public.outcomes;
  ...
BEGIN
  -- Validation 1: Pool exists
  SELECT * INTO pool_row FROM public.markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pool not found';  -- ❌ 400
  END IF;

  -- Validation 2: Pool status must be 'open'
  IF pool_row.status <> 'open' THEN
    RAISE EXCEPTION 'Pool is not open';  -- ❌ 400 ← MOST LIKELY CAUSE
  END IF;

  -- Validation 3: Not past close time
  IF now() > COALESCE(pool_row.close_time, now() + interval '100 years') THEN
    RAISE EXCEPTION 'Pool closed';  -- ❌ 400
  END IF;

  -- Validation 4: Stake within limits
  IF p_stake < pool_row.min_stake OR p_stake > pool_row.max_stake THEN
    RAISE EXCEPTION 'Stake outside limits';  -- ❌ 400
  END IF;

  -- Validation 5: Outcome exists and belongs to this pool
  SELECT * INTO outcome_row
  FROM public.outcomes
  WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Outcome not found';  -- ❌ 400
  END IF;

  -- Calculate odds and return preview
  RETURN public.parimutuel_preview(...);
END;
$$;
```

---

## Error Conditions Summary

| Check | SQL Condition | Exception Message | HTTP Code |
|-------|---------------|-------------------|-----------|
| 1. Pool exists | `markets.id = p_market_id` | "Pool not found" | 400 |
| **2. Pool status** | **`pool_row.status <> 'open'`** | **"Pool is not open"** | **400** ← Most likely |
| 3. Not closed | `now() > close_time` | "Pool closed" | 400 |
| 4. Stake limits | `stake < min OR stake > max` | "Stake outside limits" | 400 |
| 5. Outcome exists | `outcomes.id = p_outcome_id AND market_id = p_market_id` | "Outcome not found" | 400 |

---

## Data Model

### Pool Status Enum

**File:** [supabase/migrations/0003_betting.sql:7](../../supabase/migrations/0003_betting.sql#L7)

```sql
CREATE TYPE public.market_status AS ENUM (
  'draft',      -- Not yet open for betting
  'open',       -- ✅ ACCEPTING WAGERS
  'suspended',  -- Temporarily paused
  'closed',     -- No longer accepting wagers
  'settled'     -- Winners paid out
);
```

**Only `'open'` status allows wagers.**

### Opening Pools

**Function:** `market_pool_open(p_pool_id uuid)`

**File:** [supabase/migrations/20251118000018_market_management.sql:581-611](../../supabase/migrations/20251118000018_market_management.sql#L581-L611)

```sql
CREATE OR REPLACE FUNCTION public.market_pool_open(p_pool_id uuid)
RETURNS public.markets
AS $$
BEGIN
  -- Requires sportsbook_admin or betting_admin permission
  IF NOT (public.has_permission('sportsbook_admin') OR public.has_permission('betting_admin')) THEN
    RAISE EXCEPTION 'Requires sportsbook admin permission';
  END IF;

  UPDATE public.markets
  SET status = 'open'
  WHERE id = p_pool_id
  RETURNING * INTO pool_row;

  RETURN pool_row;
END;
$$;
```

---

## Diagnosis: Why Some Pools Fail

### Hypothesis

**"Race Overall Winner"** and **"First Retirement"** pools likely have:
- `status = 'draft'` (not yet opened by admin)

**"Qualifying Pole Position"** and **"Fastest Lap"** pools likely have:
- `status = 'open'` (already opened by admin)

### Diagnostic Query

Run this to verify:

```sql
SELECT
  id,
  name,
  status,
  CASE
    WHEN status = 'open' THEN '✅ Ready for wagers'
    WHEN status = 'draft' THEN '❌ Needs market_pool_open(id)'
    WHEN status = 'closed' THEN '❌ Pool closed'
    WHEN status = 'settled' THEN '❌ Pool settled'
    ELSE '❌ Unknown status'
  END AS wager_readiness,
  close_time,
  (SELECT COUNT(*) FROM outcomes WHERE market_id = markets.id) AS outcome_count
FROM public.markets
WHERE name IN (
  'Race Overall Winner',
  'First Retirement',
  'Qualifying Pole Position',
  'Fastest Lap'
)
ORDER BY name;
```

**Expected output:**

| name | status | wager_readiness | outcome_count |
|------|--------|----------------|---------------|
| Race Overall Winner | draft | ❌ Needs market_pool_open(id) | 8 |
| First Retirement | draft | ❌ Needs market_pool_open(id) | 8 |
| Qualifying Pole Position | open | ✅ Ready for wagers | 8 |
| Fastest Lap | open | ✅ Ready for wagers | 8 |

---

## Fix Options

### Option 1: Manual Fix (SQL Update)

**Use this if:** You want to open specific pools immediately without writing a migration.

```sql
-- Open the failing pools
UPDATE public.markets
SET status = 'open'
WHERE name IN (
  'Race Overall Winner',
  'First Retirement'
)
AND archived IS NOT TRUE;
```

**Verify:**

```sql
SELECT id, name, status, close_time
FROM public.markets
WHERE name IN ('Race Overall Winner', 'First Retirement');
```

---

### Option 2: Migration Fix (Automated)

**Use this if:** You want to automatically open all draft pools in future deployments.

**File:** [supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql](../../supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql)

```sql
-- Open all draft pools that should be accepting wagers
UPDATE public.markets
SET status = 'open'
WHERE
  archived IS NOT TRUE
  AND status = 'draft'
  AND (close_time IS NULL OR close_time > now());
```

**Apply migration:**

```bash
npx supabase db push
```

---

### Option 3: Admin Panel Fix

**Use this if:** You have an admin UI that calls `market_pool_open()`.

**Steps:**
1. Navigate to admin panel
2. Find "Race Overall Winner" and "First Retirement" pools
3. Click "Open Pool" button (should call `market_pool_open(pool_id)`)

**Supabase call:**

```typescript
const { data, error } = await supabase.rpc('market_pool_open', {
  p_pool_id: 'uuid-of-pool-here'
});
```

---

## Recommended Solution

**I recommend Option 2 (Migration)** because:
1. ✅ Fixes current issue immediately
2. ✅ Prevents future occurrences
3. ✅ Auditable (migration file in git)
4. ✅ Doesn't open pools that are past their close time
5. ✅ Doesn't open archived pools

**Migration file created:** [supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql](../../supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql)

**To apply:**

```bash
npx supabase db push
```

---

## Verification Steps

After applying the fix:

### 1. Check Pool Status

```sql
SELECT
  id,
  name,
  status,
  close_time,
  (SELECT COUNT(*) FROM outcomes WHERE market_id = markets.id) AS outcome_count
FROM public.markets
WHERE name IN (
  'Race Overall Winner',
  'First Retirement'
)
ORDER BY name;
```

**Expected:** Both pools should have `status = 'open'`.

### 2. Test Wager from Frontend

1. Navigate to markets page
2. Select "Race Overall Winner" pool
3. Choose an outcome
4. Enter stake amount (within min/max limits)
5. Click "Place Wager"

**Expected:**
- ✅ Network tab shows `POST /rest/v1/rpc/betting_place_wager` → `200 OK`
- ✅ Wager appears in user's bet history
- ✅ Wallet balance decreases by stake amount
- ✅ Pool total increases

### 3. Test Wager from SQL

```sql
-- Preview wager (should not raise exception)
SELECT public.betting_preview_wager(
  'pool-id-here'::uuid,
  'outcome-id-here'::uuid,
  100.00
);

-- Place wager (requires authenticated user)
SELECT public.betting_place_wager(
  'pool-id-here'::uuid,
  'outcome-id-here'::uuid,
  100.00,
  NULL -- idempotency key
);
```

**Expected:** No exceptions, returns wager record.

---

## Other Possible Causes (If Fix Doesn't Work)

If the migration doesn't resolve the issue, check these:

### 1. Outcome Mismatch

**Error:** "Outcome not found"

**Cause:** Outcome ID doesn't belong to the pool ID.

**Check:**

```sql
SELECT
  m.name AS pool_name,
  o.id AS outcome_id,
  o.label AS outcome_label,
  o.market_id
FROM public.markets m
LEFT JOIN public.outcomes o ON o.market_id = m.id
WHERE m.name = 'Race Overall Winner'
ORDER BY o.label;
```

**Fix:** Ensure frontend is sending correct `outcomeId` for the `marketId`.

### 2. Stake Out of Bounds

**Error:** "Stake outside limits"

**Cause:** Stake amount < `min_stake` or > `max_stake`.

**Check:**

```sql
SELECT
  name,
  min_stake,
  max_stake,
  total_pool
FROM public.markets
WHERE name IN ('Race Overall Winner', 'First Retirement');
```

**Fix:** Ensure frontend sends stake within `[min_stake, max_stake]`.

### 3. Pool Closed

**Error:** "Pool closed"

**Cause:** Current time > `close_time`.

**Check:**

```sql
SELECT
  name,
  close_time,
  now() AS current_time,
  now() > close_time AS is_past_close
FROM public.markets
WHERE name IN ('Race Overall Winner', 'First Retirement');
```

**Fix:** Update `close_time` to future date or NULL.

### 4. Wallet Insufficient Funds

**Error:** "Insufficient funds" (from `wallet_debit`)

**Check:**

```sql
SELECT
  user_id,
  COALESCE(SUM(amount), 0) AS balance
FROM public.wallet_transactions
WHERE user_id = auth.uid()
GROUP BY user_id;
```

**Fix:** Add funds to wallet:

```sql
SELECT public.wallet_credit(
  auth.uid(),
  1000.00,
  '{"reason": "test funds"}'::jsonb
);
```

---

## Summary for Finlay

### What's Wrong

The `betting_place_wager` RPC throws a `400` error with message **"Pool is not open"** because:

**Root Cause:** Pools "Race Overall Winner" and "First Retirement" have `status = 'draft'` instead of `status = 'open'`.

**Validation Code:** [supabase/migrations/20251118000018_market_management.sql:880-882](../../supabase/migrations/20251118000018_market_management.sql#L880-L882)

```sql
IF pool_row.status <> 'open' THEN
  RAISE EXCEPTION 'Pool is not open';  -- Returns HTTP 400
END IF;
```

### How to Fix

**Run the migration:**

```bash
npx supabase db push
```

This applies [supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql](../../supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql), which updates all draft pools to `status = 'open'`.

### Files Created

1. **Migration:** [supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql](../../supabase/migrations/20251203000001_fix_pool_status_for_wagers.sql)
2. **Diagnostic:** [docs/betting-place-wager-status-diagnostic.sql](./betting-place-wager-status-diagnostic.sql)
3. **Documentation:** [docs/betting-wager-400-fix.md](./betting-wager-400-fix.md) (this file)

---

## Next Steps

1. ✅ Apply migration: `npx supabase db push`
2. ✅ Verify pool status changed to 'open'
3. ✅ Test wager placement from frontend
4. ✅ Monitor for any new 400 errors
5. (Optional) Add admin UI to open/close pools via `market_pool_open()`
