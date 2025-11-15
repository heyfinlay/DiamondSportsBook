# DiamondSportsBook
# DBGP_V2_MANIFESTO

DayBreak Grand Prix v2 (DBGP v2) is a **race timing + parimutuel betting system** designed to be:

- **Robust** under real race pressure
- **Predictable** in how it behaves
- **Extendable** without fear of breaking core flows

This document is the **source of truth** for how the system is meant to work.  
Any implementation, refactor, or new feature should respect this manifesto.

---

## 1. Scope

DBGP v2 is responsible for:

- Running **timed racing sessions** (practice, qualifying, race)
- Providing a **public live timing view** for spectators
- Operating a **parimutuel betting pool** (Diamond Sports Book) on race outcomes
- Managing **virtual currency wallets** (deposits, withdrawals, balance)
- Enforcing **access control** for race control, betting admins, marshals, spectators

DBGP v2 is **not** responsible for:

- Real-money payments or compliance
- Video streaming / broadcast production
- Non-racing game modes or generic casino games
- Generic user messaging/chat

---

## 2. Personas

### 2.1 Race Control (RC)

- Runs sessions (practice, qualifying, race)
- Starts/stops clocks, changes flag states
- Oversees marshals, reviews incidents
- May interact with betting admin for settlement

**Needs:**

- Reliable, fast lap logging
- Clear session state (phase, flags, laps)
- Crash-safe control (reload and continue)

### 2.2 Marshal

- Assigned to specific driver(s)
- Logs laps via hotkeys/UI
- May log simple events (pit, incident flags)

**Needs:**

- Minimal latency lap logging
- Simple, focused UI
- No way to accidentally affect unrelated drivers/sessions

### 2.3 Spectator

- Watches live timing from a browser
- Sees positions, gaps, flags, clock, lap feed

**Needs:**

- Simple, read-only live timing
- No login required
- Low latency updates

### 2.4 Bettor

- Authenticated user with a wallet
- Browses markets and places wagers
- Sees odds, price impact, estimated payout
- Gets paid out when markets settle

**Needs:**

- Clear, honest odds
- Stable wallet balance
- Transparent settlement behavior

### 2.5 Betting Admin

- Creates and manages betting events/markets
- Reviews proposed settlements
- Approves settlements and large deposits/withdrawals

**Needs:**

- Clear view of pools, exposure, and winners
- Guard rails against mis-clicks
- Audit trail of actions

### 2.6 System Owner / Developer

- Adds new race formats and betting markets
- Maintains schema, RPCs, and frontends
- Needs to change things **without breaking core invariants**

---

## 3. Core Principles

These principles drive the technical design.

1. **Single Source of Truth for Time**  
   - Race time and lap timing live in the database.
   - Clients project the data; they do not own or invent time.

2. **Domain Separation**  
   - Four domains:
     - **Timing**
     - **Betting**
     - **Wallet**
     - **Identity/RBAC**
   - Each domain has clear ownership and minimal coupling.

3. **Small, Strong Mutation Surface**  
   - Only a small number of RPCs are allowed to change important state.
   - Each RPC enforces its invariants internally.

4. **Append-Only for Money**  
   - Wallet balances are the sum of immutable transaction logs.
   - No direct balance edits.

5. **Explainable Behavior**  
   - Odds, payouts, positions, and balances must be derivable and explainable from stored data.
   - No magic numbers that can’t be justified.

6. **Realtime as Projection Only**  
   - Realtime channels publish changes from the DB.
   - They do not implement business logic.

7. **Safe Extensibility**  
   - New features should plug into domains without cutting across all layers.
   - Adding a new market type or race rule shouldn’t require rewriting everything.

---

## 4. Core Invariants

If these are broken, the system is wrong, even if it “works”.

### 4.1 Time / Timing

- For each session:
  - `session_state` contains **the** authoritative race clock and phase.
  - Driver positions must be derivable from:
    - `drivers.laps`
    - `drivers.total_time_ms`
    - `drivers.status`
- Laps must:
  - Have non-negative, “sane” durations (within configured bounds).
  - Be strictly ordered (`lap_number` increments).
- The system must tolerate:
  - Client reloads
  - Multiple marshals
  - Network blips  
  without losing timing integrity.

### 4.2 Money / Wallets

- `wallet_accounts.balance` = sum of **all** related `wallet_transactions.amount`.
- No operation may result in a negative balance.
- `wallet_accounts.balance` must never be directly updated:
  - Only derived from transactions.
- Every deposit, withdrawal, wager debit, payout credit has a corresponding transaction row.

### 4.3 Markets / Odds / Settlements

- Market odds are functions of:
  - Total pool
  - Outcome-specific pool
  - Takeout
- The parimutuel computation must be consistent between:
  - Preview
  - Placement
  - Settlement
- Settlement:
  - All accepted wagers are accounted for as win or loss.
  - Payouts are deterministic given the pool and winning outcome.
  - Any rounding “dust” is tracked, not silently lost.

### 4.4 Access / Identity

- A user’s ability to perform an action depends on:
  - Role (`spectator`, `marshal`, `race_control`, `betting_admin`, `super_admin`)
  - Optional permissions array (fine-grained capabilities)
- Timing mutations require appropriate timing permissions.
- Betting admin mutations require betting permissions.
- There should be one canonical way to identify the current user and their capabilities.

---

## 5. Domains & Boundaries

### 5.1 Timing Domain

**Owns:**

- `sessions`
- `session_state`
- `drivers`
- `laps`
- `penalties`
- `pit_events`
- `race_events`
- `session_members` (marshal assignments)

**Knows about:**

- Which drivers belong to which sessions.
- How to derive current positions/laps.
- How to log laps and events.

**Does NOT know about:**

- Wallets, money, or balances.
- Wagers or pools.
- User permissions beyond “is this user allowed to control this session”.

### 5.2 Betting Domain

**Owns:**

- `events` (betting events)
- `markets`
- `outcomes`
- `wagers`
- `market_wallets`
- `pending_settlements`
- `quote_telemetry` (optional)

**Knows about:**

- How to calculate tote odds and price impact.
- How to place wagers under constraints (stake limits, market status).
- How to settle markets and compute payouts.

**Does NOT directly own:**

- Wallet balances (relies on Wallet domain for credit/debit).
- Timing details (only references sessions/drivers via IDs).

### 5.3 Wallet Domain

**Owns:**

- `wallet_accounts`
- `wallet_transactions`
- `deposits`
- `withdrawals`

**Knows about:**

- How to credit and debit accounts safely.
- How to process deposit/withdrawal workflows.

**Does NOT know about:**

- What a “market” is.
- How bets are structured.
- Race sessions or laps.

### 5.4 Identity / RBAC Domain

**Owns:**

- `profiles` (extends `auth.users`)
- `permissions` (implicit via `role` + `permissions[]`)

**Knows about:**

- Which user is in which role.
- Who is allowed to do which domain-specific mutations.

**Does NOT know about:**

- The internals of timing, betting, or wallet logic.

---

## 6. Allowed Mutations (Canonical Verbs)

These are the **high-level verbs** the system exposes. This is the “contract surface”.

### 6.1 Timing Verbs

- `timing_create_session`
- `timing_update_session_state`
- `timing_initialize_race` (start clocks & lap timers)
- `timing_log_lap`
- `timing_invalidate_last_lap`
- `timing_log_penalty`
- `timing_log_pit_event`
- `timing_delete_session_deep` (admin only)

### 6.2 Betting Verbs

- `betting_create_event_and_markets`
- `betting_open_market`
- `betting_suspend_market`
- `betting_close_market`
- `betting_preview_wager`
- `betting_place_wager`
- `betting_propose_settlement`
- `betting_approve_settlement`
- `betting_reverse_settlement` (super admin / tightly controlled)

### 6.3 Wallet Verbs

- `wallet_request_deposit`
- `wallet_approve_deposit`
- `wallet_request_withdrawal`
- `wallet_approve_withdrawal`
- `wallet_reject_withdrawal`

Internal-only, used by other RPCs:

- `wallet_credit(user_id, amount, meta)`
- `wallet_debit(user_id, amount, meta)`

### 6.4 Identity Verbs

- `identity_ensure_profile`
- `identity_set_role`
- `identity_add_permission`
- `identity_remove_permission`

Any new mutation should fit naturally into one of these domains.  
If it doesn’t, reconsider the design before adding it.

---

## 7. Critical Flows

These flows are the backbone of DBGP v2.

### 7.1 Start & Run a Race Session

1. Admin creates session and drivers (`timing_create_session`).
2. Race Control opens `/control/:sessionId`.
3. RC advances phases:
   - Setup → Warmup → Grid → Race using `timing_update_session_state`.
4. On “Race”:
   - `timing_initialize_race` sets `current_lap_started_at` for all drivers.
5. Marshals log laps via `timing_log_lap`.
6. RC ends race by setting phase to `finished`.

**Invariants:**

- Lap timing remains consistent even if clients reload.
- Positions derived from DB match what was shown live.

### 7.2 Place a Wager

1. Bettor selects market & outcome.
2. System fetches pool + preview via `betting_preview_wager` (or client-computed with same logic).
3. Bettor confirms stake.
4. System calls `betting_place_wager`:
   - Checks auth and permissions.
   - Validates market is open and not past close.
   - Enforces stake limits and wallet balance.
   - Debits wallet via Wallet domain.
   - Inserts wager and updates market pool.

**Invariants:**

- No negative balance.
- Odds snapshot stored with wager.
- Idempotency key prevents double betting on network retry.

### 7.3 Settle a Market

1. Race ends, final results known.
2. Admin proposes settlement via `betting_propose_settlement`.
3. Betting Admin reviews:
   - Winning outcome, pool totals, estimated payouts.
4. Betting Admin approves via `betting_approve_settlement`:
   - All accepted wagers processed.
   - Winners paid via Wallet domain.
   - Market marked as settled.
   - Dust tracked.

Optional: if a mistake is caught early, `betting_reverse_settlement` may be used under strict rules.

**Invariants:**

- Total payouts + dust + takeout = total pool.
- Every accepted wager ends as win or loss.
- Wallet transactions reflect all payouts.

### 7.4 Wallet Deposit / Withdrawal

Deposit:

1. User submits deposit request: `wallet_request_deposit`.
2. Betting Admin verifies and approves: `wallet_approve_deposit`.
3. Wallet credited via transaction, balance updated by sum.

Withdrawal:

1. User submits withdrawal request: `wallet_request_withdrawal`:
   - Debit and lock funds immediately.
2. Betting Admin approves or rejects:
   - Approve: nothing more to do; funds already debited.
   - Reject: `wallet_reject_withdrawal` refunds via credit transaction.

**Invariants:**

- All changes to balance are explainable by transactions.
- Deposits/withdrawals always have corresponding, auditable rows.

---

## 8. Observability & Audit

Every domain must support answering:

> “What just happened, and why?”

### 8.1 Timing

- `race_events` table logs:
  - Phase changes
  - Flag changes
  - Manual interventions
- Lap history per driver is queryable by session, ordered by lap number.

### 8.2 Betting

- `wagers` carries:
  - Stake
  - Odds before/after
  - Status transitions
  - Payout amount
- `pending_settlements` carries:
  - Who proposed
  - Who approved
  - What was settled and when

### 8.3 Wallet

- `wallet_transactions` log every debit/credit with `kind` and `meta`.
- Ability to reconstruct balance history over time.

### 8.4 Identity

- Actions that require elevated roles (e.g. settlement, reverse settlement, session deletion) should be traceable back to a user.

---

## 9. Implementation Constraints

- Use a single Supabase project (monolith), but keep domain boundaries clear in:
  - Schema
  - RPC naming
  - Code organization
- Avoid duplicating business logic across frontend/backend:
  - Odds and payout math defined canonically in the backend.
  - Frontend may mirror it for preview, but backend is source of truth.
- Realtime is used for **updates**, not as a business logic trigger:
  - Mutations go through RPCs.
  - Realtime only publishes changes.

---

## 10. Non-Goals

The system is **not** trying to:

- Be a generic ledger for everything in the city.
- Support arbitrary game types beyond DBGP races and related betting.
- Act as a general analytics/BI platform.

If a feature request conflicts with the core principles above, it should be challenged or scoped into a separate system.

---

## 11. How to Use This Document

- When adding a feature:
  - Identify the domain(s) it belongs to.
  - Ensure it respects the invariants of those domains.
  - Add or reuse verbs (RPCs) in that domain instead of hacking around them.

- When debugging:
  - Use the domain boundaries to localize the problem.
  - Verify invariants first (time, money, access) before touching UI.

- When refactoring:
  - Keep the allowed mutations and invariants stable.
  - Internals can change, but the behavior defined here should not break.

If something in the code contradicts this manifesto, the manifesto wins.
