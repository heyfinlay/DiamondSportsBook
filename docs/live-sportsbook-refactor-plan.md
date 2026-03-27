# Live Sportsbook Refactor Plan

## Objective

Refactor the current Diamond Sportsbook app from a DBGP race-timing driven betting product into a live, externally sourced sportsbook that:

- imports real-world event data for Formula 1, NRL, AFL, and MMA
- auto-creates betting events and pools from that feed
- lets users top up with in-game currency and place parimutuel wagers
- updates markets and results automatically as live data changes
- settles pools from official final results with a full audit trail

This document is based on the current codebase and is intentionally additive-first. The goal is to preserve the working wallet, wager, pricing, settlement, and realtime patterns already in the repo while replacing the event source and market orchestration model underneath them.

## Current Codebase Assessment

The existing app already has four useful foundations:

1. A working wallet ledger.
   `wallet_accounts`, `wallet_transactions`, deposit and withdrawal flows already exist and follow append-only transaction rules.

2. A working parimutuel betting core.
   `events`, `markets`, `outcomes`, `wagers`, `pending_settlements`, payout audit tables, and settlement RPCs already support pool-based betting.

3. Realtime client projections.
   The frontend already consumes Supabase realtime and React Query for market and wallet refresh.

4. Admin tooling.
   The repo already contains market builder, settlement review, and operational admin pages.

The main limitation is that the product model is still coupled to internally managed timing sessions and driver/team concepts from the DBGP world:

- betting events can be linked to `timing_sessions`
- market creation assumes session drivers or championship teams
- market UI types still use `teamName` and `driverName`
- standings and hero sections are race-oriented
- there is no ingestion pipeline for third-party sports data

## Recommendation In One Sentence

Keep the wallet, parimutuel pricing, wager placement, settlement, and most admin mechanics; add a new sports-data ingestion domain and refactor the UI/domain layer so betting markets are driven by normalized external sports events instead of manually timed sessions.

## Recommended Backend Data Provider

### Primary recommendation

Use Sportradar as the first provider abstraction if the budget supports it.

Why:

- it has current feed coverage across the four sports you named
- it gives a cleaner path to one provider abstraction instead of one vendor per sport
- it supports both schedule/result style endpoints and live summaries

Relevant current docs:

- Formula 1 stage summary: [Sportradar F1 Stage Summary](https://developer.sportradar.com/racing/reference/f1-stage-summary)
- Formula 1 live cache update to 1s TTL: [Sportradar Formula 1 API changelog](https://developer.sportradar.com/sportradar-updates/changelog/formula-1)
- Formula 1 live race data fields: [Sportradar Formula 1 live race data points](https://developer.sportradar.com/sportradar-updates/changelog/formula-1-api-live-race-data-points)
- Australian Rules live summaries: [Sportradar Aussie Rules live summaries](https://developer.sportradar.com/aussie-rules-football/reference/aussie-rules-live-summaries)
- MMA live summaries: [Sportradar MMA live summaries](https://developer.sportradar.com/mma/reference/mma-live-summaries)
- Rugby daily summaries with rugby league categories: [Sportradar Rugby daily summaries](https://developer.sportradar.com/rugby/reference/rugby-daily-summaries)

### Practical provider strategy

Build the app around a provider adapter interface, even if you start with only one vendor.

Recommended interface:

```ts
type ExternalSportsProvider = {
  syncCompetitions(): Promise<void>;
  syncSchedule(from: string, to: string): Promise<void>;
  syncLiveEvents(): Promise<void>;
  syncEventDetail(externalEventId: string): Promise<void>;
  mapFinalResult(externalEventId: string): Promise<NormalizedResult>;
};
```

That keeps you free to add a second vendor later if one sport needs better coverage or lower cost.

## Target Architecture

### Keep as-is or mostly as-is

- Supabase auth and RLS patterns
- wallet ledger model
- `betting_place_wager` style RPC workflow
- parimutuel preview math
- settlement audit tables and payout ledger
- React Query plus Supabase realtime projection model

### Refactor heavily

- market creation and event creation logic
- outcome identity model
- landing pages and market detail pages that assume race/driver semantics
- admin market builder, which is currently session-centric

### Add new backend services

1. Sports feed ingestor
   Polls or receives external data, normalizes it, writes canonical sports tables.

2. Market orchestrator
   Creates events/pools/outcomes from normalized sports data and updates lifecycle state.

3. Settlement orchestrator
   Waits for official final results, proposes settlements, and optionally auto-confirms after validation rules pass.

4. Reconciliation worker
   Re-runs syncs, detects drift, and repairs stale or missed event updates.

## Important Design Decision

Do not try to stretch `timing_sessions` into a generic live sports table.

That will create a long-term schema mess because:

- F1 is stage/lap/sector based
- AFL and NRL are team-match based
- MMA is fight-card/fight based
- the current timing schema is built for manually logged race control operations

Instead, keep `timing_*` as the legacy/manual event domain and introduce a new normalized external sports domain beside it.

## Proposed Database Refactor

### 1. Add a normalized sports data domain

Create new tables:

- `sports_providers`
- `sports_competitions`
- `sports_seasons`
- `sports_participants`
- `sports_events`
- `sports_event_participants`
- `sports_event_snapshots`
- `sports_event_results`
- `sports_sync_runs`

Suggested responsibilities:

`sports_providers`
- provider key
- provider name
- config metadata

`sports_competitions`
- sport code: `f1`, `nrl`, `afl`, `mma`
- provider id
- league/competition name
- season metadata

`sports_participants`
- canonical participant id
- provider participant id
- participant type: `driver`, `team`, `fighter`
- display name
- short name
- branding metadata

`sports_events`
- canonical event id
- provider event id
- sport code
- competition id
- event type: `race`, `match`, `fight`
- status: `scheduled`, `live`, `paused`, `completed`, `official`, `cancelled`
- scheduled start
- live clock/state payload
- official result payload

`sports_event_participants`
- event id
- participant id
- side/order/slot
- role metadata

`sports_event_snapshots`
- event id
- ingested at
- raw payload
- normalized payload

`sports_event_results`
- event id
- participant id
- rank/result/outcome
- result status: `provisional`, `official`
- result payload

`sports_sync_runs`
- provider
- job type
- started/finished timestamps
- status
- counts
- error payload

### 2. Extend existing betting tables instead of replacing them

Keep `events`, `markets`, `outcomes`, and `wagers`, but add fields that let them point to the new sports domain.

Recommended additions:

`events`
- `source_type` enum: `manual_timing`, `external_feed`
- `sport_code`
- `competition_id` references `sports_competitions`
- `sports_event_id` references `sports_events`
- `auto_created boolean`
- `market_template_key`
- `external_status`

`markets`
- `auto_managed boolean`
- `trading_status_reason`
- `bet_delay_seconds`
- `suspend_on_live_state jsonb`
- `result_derivation jsonb`

`outcomes`
- `participant_type`
- `participant_id`
- `sports_participant_id`
- `result_key`
- `display_order`

This approach keeps the working wager and settlement model intact while making the market container generic.

### 3. Add market automation tables

Create:

- `market_templates`
- `market_template_pools`
- `market_generation_runs`

Use them to answer:

- what markets should be created for each sport
- when they should open
- when they should suspend/close
- how winners should be derived

Example templates:

- F1 race winner
- F1 podium finish
- AFL match winner
- NRL match winner
- MMA fight winner

Do not start with complex in-play derivative props. Start with simple winner markets and only add more once auto-settlement is reliable.

## Market Lifecycle Model

The current repo already has pool lifecycle controls like open, suspend, close, propose settlement, confirm settlement. Reuse those, but make the transition rules automatic.

Recommended flow:

1. Schedule sync imports future sports events.
2. Market orchestrator creates `events` and related `markets`/`outcomes`.
3. Pools open automatically at a configurable time before start.
4. Live ingestor updates event status and scores/standings.
5. Critical state changes trigger automatic pool suspension or closure.
6. Once result status becomes official, settlement orchestrator computes winners.
7. Existing settlement RPCs are called.
8. Settlement audit pages continue to show the final ledger.

## Sport-Specific Mapping Rules

### Formula 1

Recommended initial markets:

- race winner
- podium finish
- head-to-head driver matchup

Data mapping:

- one `sports_event` for the race stage
- participants are drivers
- finishing order comes from official stage summary / results

Settlement rule:

- settle only from official or confirmed results, not from provisional live order

### NRL

Recommended initial markets:

- match winner
- head-to-head only

Data mapping:

- one `sports_event` per match
- participants are teams
- scores and match status come from live summaries/detail feeds

Settlement rule:

- winner from final official score
- if abandoned or no official result, void/refund

### AFL

Recommended initial markets:

- match winner
- margin band later

Data mapping:

- one `sports_event` per match
- participants are teams

Settlement rule:

- same pattern as NRL

### MMA

Recommended initial markets:

- fight winner
- method of victory later

Data mapping:

- one `sports_event` per fight, not just the card
- participants are fighters

Settlement rule:

- settle only once the fight result is final
- no-contest or overturned decisions should void/refund unless a later official winner is published

## Application Refactor By Area

### Betting domain

Change `src/domains/betting/api/marketAdminApi.ts` and related RPCs so market creation can work from either:

- manual builder input
- auto-generated sports event templates

Add new RPCs:

- `sports_sync_schedule(...)`
- `sports_sync_live(...)`
- `market_generate_for_sports_event(...)`
- `market_refresh_from_sports_event(...)`
- `market_auto_settle_from_sports_event(...)`

Keep `betting_place_wager`, `market_pool_preview_settlement`, and `market_pool_confirm_settlement` as the final mutation surface for money and settlements.

### Wallet domain

Very little needs to change.

Recommended additions:

- add transaction meta fields that include `sports_event_id`, `sport_code`, and `market_template_key`
- add optional anti-abuse controls if you expect users to top up rapidly before live markets

### Frontend market models

Current market UI types are race-specific. Refactor them to generic competitor semantics.

Current issue:

- `Outcome` uses `teamName` and `driverName`

Refactor to:

```ts
type Outcome = {
  id: string;
  label: string;
  participantName: string;
  participantType: "driver" | "team" | "fighter" | "custom";
  participantMeta?: Record<string, unknown>;
  color?: string;
  marketShare: number;
  baselineOdds: number;
  numBets: number;
  diamondsStaked: number;
  trendDelta: number;
};
```

Files that will need this treatment include:

- `src/features/markets/types.ts`
- `src/features/markets/domain/adapter.ts`
- `src/app/markets/MarketsPage.tsx`
- `src/app/markets/MarketDetailPage.tsx`
- outcome display components under `src/features/markets/components`

### Live data UI

Add a new public event/live center that shows:

- event state
- score or order
- settlement status
- open/suspended/closed market state

Do not reuse the current race-control screens for this. Those screens are operator tools for manual timing, not spectator views for external live feeds.

### Admin UI

Add new admin surfaces:

- provider health dashboard
- sync run history
- unmapped participants/events queue
- auto-generated market review
- settlement exception queue

The current admin dashboard is wallet-heavy and should stay that way, but it needs links into ingestion and automated market operations.

## Recommended Execution Model

### Best fit

Use a dedicated Node/TypeScript worker plus Supabase.

Why:

- frequent live polling is awkward to run only as client logic
- feed reconciliation, retrying, and backoff logic belong off the frontend
- market automation and settlement orchestration should not depend on a browser being open

Recommended split:

- Supabase Postgres: source of truth
- Supabase Realtime: UI projection
- Supabase Edge Functions: optional authenticated operational endpoints
- dedicated worker: polling, normalization, generation, lifecycle automation

### Job types

1. Nightly or hourly metadata sync
   competitions, seasons, participants, schedule

2. Pre-event warmup sync
   pull the next 24-48 hours more frequently

3. Live event polling loop
   poll active events every few seconds based on provider TTL and budget

4. Settlement finality loop
   detect official results and settle

5. Reconciliation loop
   backfill missed updates and compare canonical result state

## Risk Controls

### 1. Never settle from transient live state

Always require an official/final result marker from the provider or an admin override.

### 2. Auto-suspend on uncertainty

Suspend pools when:

- provider feed is stale
- event status becomes unknown
- event is delayed/interrupted
- result is provisional and the sport commonly changes outcomes after review

### 3. Snapshot every external payload

Persist the raw feed payload for every meaningful event update. This is essential for debugging disputes.

### 4. Keep admin override paths

You still need:

- force suspend
- reopen
- void
- manual settlement override

### 5. Limit first release scope

Phase 1 should avoid:

- next scorer markets
- minute-by-minute props
- same-event parlays
- partial cashout
- markets requiring sub-second feed integrity

## Phased Delivery Plan

### Phase 1: Foundation

- add normalized sports domain tables
- add provider adapter layer
- build schedule and live ingestion worker
- extend `events` with external feed linkage
- add admin sync health page

### Phase 2: Auto-generated pre-match markets

- implement F1 winner, AFL winner, NRL winner, MMA winner templates
- auto-create events/markets/outcomes
- refactor public markets UI to generic participant labels
- keep settlement admin-reviewed at first

### Phase 3: Automated settlement

- derive winners from official result records
- auto-propose settlements
- optional auto-confirm for approved market types
- add reconciliation and stale-feed safety rules

### Phase 4: Controlled live/in-play expansion

- support live state display
- auto-suspend and auto-close logic
- only then consider limited in-play pools where the rules are simple and defensible

## Concrete Repo Changes To Make First

If I were implementing this codebase, I would start in this order:

1. Add a migration for the new `sports_*` tables and `events` extensions.
2. Create a new `src/domains/sports/` domain with:
   - provider adapters
   - normalization types
   - sync APIs
   - admin queries
3. Refactor `src/features/markets/types.ts` away from driver/team naming.
4. Update `src/features/markets/domain/adapter.ts` so outcomes are generic.
5. Add an admin page for feed sync status and auto-generated market review.
6. Add market generation RPCs and a worker that calls them.
7. Update the landing page and market detail page to show sport/event context.
8. Add settlement derivation rules for the four initial market types.

## What Should Not Be Rewritten Immediately

- wallet ledger logic
- core wager placement RPC contract
- settlement payout audit path
- React Query plus Supabase realtime data flow

Those are already the strongest parts of the build.

## Final Recommendation

This should be treated as a sportsbook source-of-truth refactor, not a UI-only change.

The correct architecture is:

- external sports data domain for schedule/live/result ingestion
- existing betting domain for pools, wagering, and settlements
- existing wallet domain for in-game currency
- a new automation layer that connects sports events to market lifecycle

If you want, the next practical step is for me to turn this into an implementation backlog with:

- exact SQL migrations
- proposed TypeScript types
- worker job outlines
- the first set of files to change in this repo

