# Session Deletion and Archival Implementation

## Summary

This document describes the implementation of proper session deletion semantics and archival functionality for the Diamond Sports Book / DBGP app. The changes address FK constraint violations when deleting sessions with linked events/markets, and provide a way to archive completed sessions while preserving all data.

## Problem Statement

**Original Issue:**
- When admins clicked "Delete Session", the RPC `timing_delete_session_deep` would fail with:
  - HTTP 409
  - Postgres error 23503: `update or delete on table "timing_sessions" violates foreign key constraint "events_session_id_fkey" on table "events"`
- This occurred because the `events` table has a foreign key to `timing_sessions.id` without `ON DELETE CASCADE`

**Product Requirements:**
- Real DBGP events and markets should NOT be hard-deleted
- Completed sessions and settled/archived markets should:
  - NOT appear on the "Live Markets" landing page
  - Still be visible on a dedicated "Results / Past Markets" page for historical reference
- Hard-delete should only work for empty "test" sessions with no events/markets/timing data

## Implementation

### 1. Database Schema Changes

#### Migration: `20251120000001_fix_session_deletion_and_archival.sql`

**Added `archived_at` column:**
```sql
ALTER TABLE public.timing_sessions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
```

This column tracks when a session was archived. Archived sessions do not appear on Live Markets but can be shown on Results pages.

### 2. Database RPCs

#### A. `timing_delete_session_deep` - Redesigned with Validation

**Previous behavior:** Blindly attempted to delete the session, causing FK violations.

**New behavior:**
1. Checks if the session has any linked events (markets)
2. Checks if the session has any timing data (drivers, laps)
3. If either exists, raises a user-friendly exception:
   ```
   Cannot delete session: X linked event(s) found. Archive the session instead using timing_archive_session.
   ```
4. Only proceeds with deletion if session is completely empty

**Key code:**
```sql
SELECT COUNT(*) INTO event_count
FROM public.events
WHERE session_id = p_session_id;

IF event_count > 0 THEN
  RAISE EXCEPTION 'Cannot delete session: % linked event(s) found. Archive the session instead...'
    USING HINT = 'Use timing_archive_session to hide this session from Live Markets...';
END IF;
```

#### B. `timing_archive_session` - New RPC

Archives a session and all its associated markets.

**What it does:**
1. Validates the session exists and is not already archived
2. Updates session: `status = 'completed'`, `archived_at = now()`
3. Archives all markets linked to the session's events: `archived = true`, `archived_at = now()`

**Authorization:** Requires `super_admin` or `race_control` permission

**Usage:**
```sql
SELECT timing_archive_session('session-uuid-here');
```

#### C. `timing_restore_session` - New RPC

Restores an archived session, making it visible on Live Markets again.

**What it does:**
1. Validates the session exists and is currently archived
2. Clears `archived_at` on the session
3. Restores all markets: `archived = false`, `archived_at = NULL`

**Authorization:** Requires `super_admin` or `race_control` permission

### 3. Frontend API Layer

#### File: `src/domains/timing/api/timingApi.ts`

**Added functions:**
```typescript
export const archiveSession = async (sessionId: string) => {
  const { error } = await supabase.rpc("timing_archive_session", {
    p_session_id: sessionId
  });
  if (error) throw error;
};

export const restoreSession = async (sessionId: string) => {
  const { error } = await supabase.rpc("timing_restore_session", {
    p_session_id: sessionId
  });
  if (error) throw error;
};
```

**Updated `fetchSessions` to include `archived_at`:**
```typescript
.select(`
  id,
  name,
  track_name,
  laps_target,
  mode,
  status,
  starts_at,
  created_at,
  archived_at,  // NEW
  session_state:timing_session_state(...)
`)
```

**Updated `sessionSummarySchema`:**
```typescript
const sessionSummarySchema = z.object({
  // ... existing fields
  archived_at: z.string().nullable().optional(),
  // ...
});
```

#### File: `src/domains/betting/api/bettingApi.ts`

**Added `fetchArchivedMarketEvents` function:**
- Fetches events with `timing_sessions.archived_at` populated or `events.status IN ('settled', 'archived')`
- Returns markets with settled/archived statuses
- Suitable for displaying on a Results/Past Markets page

**Current `fetchMarketEvents` behavior:**
- Already filters markets to only show `!market.archived && ["open", "closed"].includes(market.status)`
- This ensures archived markets don't appear on Live Markets

### 4. Admin UI Changes

#### File: `src/app/admin/TimingSessionsPage.tsx`

**Added mutations:**
- `archiveMutation`: Calls `archiveSession`, shows success toast
- `restoreMutation`: Calls `restoreSession`, shows success toast

**Enhanced `deleteMutation` error handling:**
```typescript
onError: (error: Error) => {
  const shouldArchive = error.message.includes("Archive") || error.message.includes("archive");
  toast({
    variant: "error",
    title: "Unable to delete session",
    description: shouldArchive
      ? "This session has events or timing data and cannot be deleted. Use the Archive button instead..."
      : error.message
  });
}
```

**SessionRow Component Updates:**

1. **Visual Indicator:**
   - Shows "Archived" badge next to session status if `archived_at` is set

2. **Button Logic:**
   - **Start/Finish buttons:** Only shown if session is NOT finished and NOT archived
   - **Archive button:** Only shown if session IS finished but NOT archived (yellow/warning color)
   - **Restore button:** Only shown if session IS archived (green color)
   - **Delete button:** Always shown, but will now fail with helpful message if session has data

**Confirmation messages:**
- Delete: "Delete this session? This only works for empty sessions with no events or timing data."
- Archive: "Archive this session? It will no longer appear on Live Markets, but all data will be preserved and you can restore it later."

## User Workflows

### A. Deleting an Empty Test Session

1. Admin navigates to Admin > Timing Sessions
2. Finds a test session with no events/markets/timing data
3. Clicks **Delete**
4. Confirms the deletion
5. **Result:** Session is permanently deleted ✓

### B. Attempting to Delete a Session with Data

1. Admin navigates to Admin > Timing Sessions
2. Finds a session with linked events or timing data
3. Clicks **Delete**
4. Confirms the deletion
5. **Result:** Error toast appears:
   > "This session has events or timing data and cannot be deleted. Use the Archive button instead to hide it from Live Markets while preserving all data."
6. Session is NOT deleted ✓

### C. Archiving a Completed Session

1. Admin navigates to Admin > Timing Sessions
2. Finds a finished/completed session
3. Clicks **Archive** (yellow button)
4. Confirms the archival
5. **Result:**
   - Success toast: "Session archived. The session and its markets will no longer appear on Live Markets."
   - Session shows "Archived" badge
   - Archive button is replaced with **Restore** button (green)
   - Session and its markets are hidden from public Live Markets page ✓

### D. Restoring an Archived Session

1. Admin navigates to Admin > Timing Sessions
2. Finds an archived session (shows "Archived" badge)
3. Clicks **Restore** (green button)
4. **Result:**
   - Success toast: "Session restored. The session and its markets are now visible on Live Markets again."
   - "Archived" badge disappears
   - Restore button is replaced with **Archive** button
   - Session and markets reappear on Live Markets ✓

### E. Public User Experience

**Live Markets Page (`/markets`):**
- Shows only events with:
  - Non-archived sessions (`timing_sessions.archived_at IS NULL`)
  - Sessions with status `'scheduled'` or `'active'`
  - Markets with status `'open'` or `'closed'` and `archived = false`
- **Does NOT show:**
  - Archived sessions/markets
  - Settled/completed markets
  - Deleted sessions (obviously)

**Results/Past Markets Page (to be implemented):**
- Would use `fetchArchivedMarketEvents()` to show:
  - Archived sessions and their markets
  - Settled/completed markets with final pool totals
  - Historical outcomes for reference

## Technical Details

### Database Functions Created/Modified

1. **`timing_delete_session_deep(p_session_id uuid)`**
   - Modified to validate before deletion
   - Raises descriptive exceptions
   - Only deletes empty sessions

2. **`timing_archive_session(p_session_id uuid)` - NEW**
   - Sets `timing_sessions.archived_at = now()`
   - Sets `timing_sessions.status = 'completed'`
   - Archives all related markets

3. **`timing_restore_session(p_session_id uuid)` - NEW**
   - Clears `timing_sessions.archived_at`
   - Restores all related markets

4. **`get_live_market_events()` - NEW (for future use)**
   - Returns events suitable for Live Markets
   - Filters out archived sessions/markets

5. **`get_archived_market_events()` - NEW (for future use)**
   - Returns events suitable for Results page
   - Shows only archived/completed sessions

### Files Modified

**Database:**
- `supabase/migrations/20251120000001_fix_session_deletion_and_archival.sql` (NEW)

**Frontend API:**
- `src/domains/timing/api/timingApi.ts`
- `src/domains/betting/api/bettingApi.ts`

**Frontend UI:**
- `src/app/admin/TimingSessionsPage.tsx`

## Testing Checklist

### ✅ Delete Empty Session
- [ ] Create a new test session with no events/markets
- [ ] Verify Delete button successfully removes it
- [ ] Confirm session no longer appears in list

### ✅ Delete Session with Data (Should Fail)
- [ ] Create a session with events and markets
- [ ] Click Delete button
- [ ] Verify error toast suggests using Archive instead
- [ ] Confirm session is NOT deleted

### ✅ Archive Completed Session
- [ ] Finish a session (with events/markets)
- [ ] Click Archive button
- [ ] Verify success toast appears
- [ ] Confirm "Archived" badge shows
- [ ] Navigate to Live Markets (`/markets`)
- [ ] Verify session/markets do NOT appear

### ✅ Restore Archived Session
- [ ] Find an archived session in admin
- [ ] Click Restore button
- [ ] Verify success toast appears
- [ ] Confirm "Archived" badge disappears
- [ ] Navigate to Live Markets
- [ ] Verify session/markets DO appear

## Future Work

### Results/Past Markets Page

Create a new public route (e.g., `/results`) that:
- Uses `fetchArchivedMarketEvents()` API
- Displays completed sessions and their final outcomes
- Shows settled markets with:
  - Final pool totals
  - Winning outcomes
  - Payout calculations
- Allows users to review historical betting results

**Implementation suggestion:**
```typescript
// src/app/results/ResultsPage.tsx
const ResultsPage = () => {
  const eventsQuery = useQuery({
    queryKey: ["archived-market-events"],
    queryFn: fetchArchivedMarketEvents
  });

  return (
    <div>
      <h1>Past Markets & Results</h1>
      {/* Display archived events and settled markets */}
    </div>
  );
};
```

## Summary of Behavior Changes

| Scenario | Before | After |
|----------|--------|-------|
| Delete empty session | ✅ Success | ✅ Success (unchanged) |
| Delete session with events | ❌ FK constraint error (HTTP 409) | ❌ User-friendly error suggesting Archive |
| Archive completed session | ⛔ Not possible | ✅ Success, hides from Live Markets |
| Restore archived session | ⛔ Not possible | ✅ Success, shows on Live Markets again |
| Live Markets visibility | Shows all open/closed markets | Shows only non-archived markets ✅ |
| Results page | ⛔ Doesn't exist | 🔜 Can be implemented using `fetchArchivedMarketEvents()` |

## Deployment Notes

1. **Migration applied:** `20251120000001_fix_session_deletion_and_archival.sql` has been pushed to the database
2. **No breaking changes:** Existing functionality preserved
3. **Backward compatible:** Sessions without `archived_at` work as before
4. **Frontend build:** Successful TypeScript compilation confirmed

---

**Implementation Date:** November 20, 2025
**Status:** ✅ Complete and deployed
