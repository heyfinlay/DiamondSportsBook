# DBGP v2 Agent Guide

This guide distills the DBGP_v2_Manifesto into actionable guardrails for any agent (developer, operator, reviewer) working on Diamond Sports Book. It is intentionally terse; when in doubt, re-read the manifesto and favor its wording over any creative shortcut.

---

## 1. Mission & Scope Checks

1. **Stay inside DBGP v2’s lane.** We build timed racing, live timing, parimutuel betting, wallets, and RBAC. Nothing about real-money compliance, video, generic chat, or off-domain mini games. (Manifesto §1)
2. **Protect robustness, predictability, extensibility.** Every change should make the system behave more deterministically under stress, never less. (Intro)

Before starting work, explicitly state which of the four domains (Timing, Betting, Wallet, Identity) the change touches. If it crosses domains, call out the seam and why the coupling is unavoidable.

---

## 2. Domain Quick Reference (Manifesto §5)

- **Timing** owns session clocks, drivers, laps, penalties, pit & race events. It never talks money or wallet state.
- **Betting** owns events/markets/outcomes/wagers and tote math. It asks the Wallet domain to actually move funds.
- **Wallet** owns accounts, transactions, deposits, withdrawals. Balances are sums of immutable transactions only.
- **Identity/RBAC** owns profiles, roles, permissions. It is the single source for “who can press this button?”.

Always confirm the data you touch lives in the domain you’re editing. Leaking a concept (e.g., odds math) into another domain is a smell.

---

## 3. Core Invariants Checklist (Manifesto §4)

| Domain | Never Break These |
| --- | --- |
| Timing | `session_state` is the only race clock; laps strictly increment and stay within sane bounds; positions derive solely from drivers’ DB state. |
| Wallet | `wallet_accounts.balance = SUM(wallet_transactions)`; no negative balances; balances are never directly edited. |
| Betting | Odds/payout math is consistent across preview, placement, settlement; every accepted wager becomes win or loss; payout + dust + takeout equals pool. |
| Identity | A user’s role/permissions fully determine access; timing/betting mutations enforce the right checks. |

Any feature or fix starts by verifying its invariants. If one breaks, the bug is not solved.

---

## 4. Canonical Mutations Only (Manifesto §6)

Allowed verbs per domain:

- **Timing:** `timing_create_session`, `timing_update_session_state`, `timing_initialize_race`, `timing_log_lap`, `timing_invalidate_last_lap`, `timing_log_penalty`, `timing_log_pit_event`, `timing_delete_session_deep`.
- **Betting:** `betting_create_event_and_markets`, `betting_open_market`, `betting_suspend_market`, `betting_close_market`, `betting_preview_wager`, `betting_place_wager`, `betting_propose_settlement`, `betting_approve_settlement`, `betting_reverse_settlement`.
- **Wallet:** `wallet_request_deposit`, `wallet_approve_deposit`, `wallet_request_withdrawal`, `wallet_approve_withdrawal`, `wallet_reject_withdrawal`, plus the internal `wallet_credit`/`wallet_debit`.
- **Identity:** `identity_ensure_profile`, `identity_set_role`, `identity_add_permission`, `identity_remove_permission`.

Do not add ad-hoc tables, triggers, or client logic to mutate critical state. If a needed mutation doesn’t fit these verbs, revisit the design before proceeding.

---

## 5. Critical Flow Guardrails (Manifesto §7)

1. **Running a session:** Race Control drives phases via `timing_update_session_state`; marshals only log laps/events. Reloads and multiple clients must not desync the DB clock.
2. **Placing a wager:** Preview matches placement maths, wallet debit happens via the Wallet domain, odds snapshot stored with the wager, and idempotency protects retries.
3. **Settling a market:** Two-step approval (`propose` then `approve`), every wager resolves, payouts flow through wallet transactions, dust is captured.
4. **Deposits/withdrawals:** Deposits credit only after admin approval; withdrawals debit immediately and refund only through `wallet_reject_withdrawal`.

When implementing UI/API helpers, mirror these flow steps and fail early if a step is skipped.

---

## 6. Observability & Audit Promises (Manifesto §8)

- Timing changes are mirrored in `race_events` and lap history.
- Betting actions track stake, odds before/after, status history, settlement provenance.
- Wallet ledgers show every debit/credit with `kind` + metadata to reconstruct balances.
- Identity-sensitive actions attribute to a specific user.

If a new feature cannot answer “what just happened and why?” using stored data, it is incomplete.

---

## 7. Implementation Constraints & Non-Goals (Manifesto §§9–10)

- Single Supabase project, strong schema/RPC layering, realtime is projection only.
- Backend defines canonical math; frontend copies only for previews.
- Reject requests that would turn DBGP into a generic casino, analytics suite, or ledger.

---

## 8. Working Rules for Agents

1. Map every task to a domain and invariant set before writing code.
2. Prefer extending existing verbs/routines to adding new ones.
3. Keep business logic server-side; clients project read models and emit verb calls.
4. Document any required audit signals when adding a feature.
5. If an implementation contradicts the manifesto, fix the implementation—not the manifesto.

Use this guide as your pre-flight checklist. When judgement calls arise, cite the manifesto in PRs/reviews so decisions stay anchored to the source of truth.
