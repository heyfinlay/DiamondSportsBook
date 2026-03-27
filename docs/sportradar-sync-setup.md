# Sportradar Sync Setup

This repo now includes a Supabase Edge Function at [supabase/functions/sportradar-sync/index.ts](/Users/finlaysturzaker/Desktop/DIAMOND/DiamondSportsBook/supabase/functions/sportradar-sync/index.ts) and DB automation helpers in [20260327204000_sports_sync_automation.sql](/Users/finlaysturzaker/Desktop/DIAMOND/DiamondSportsBook/supabase/migrations/20260327204000_sports_sync_automation.sql).

## Required secrets

Set these in the Supabase project:

- `SPORTRADAR_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Optional:

- `SPORTRADAR_SYNC_SHARED_SECRET`

Use the shared secret only if you want to trigger the function from a scheduler without a signed-in admin user.

## Current behavior

- Team sports and MMA use daily summaries plus live summaries.
- Formula 1 uses seasons, stage schedule, and stage summary.
- Auto-generated markets are single-winner only.
- `f1_podium_finish` is intentionally disabled because the current settlement engine supports one winning outcome only.
- Draw outcomes are generated for NRL, AFL, and soccer match-winner pools.

## Recommended trial-plan usage

For a 1000-call trial budget, keep the initial rollout conservative:

- Run `schedule` sync once per day.
- Run `live` sync only around active event windows.
- Keep soccer disabled until you set specific competition filters.
- Start with `f1`, `nrl`, `afl`, and `mma`.

Suggested schedule:

1. `schedule` sync once daily in the morning.
2. `live` sync every 5-10 minutes only while an event is active.
3. `full` sync manually from the admin dashboard when testing.

## Provider config

The `sportradar` row in `sports_providers` now carries default config in `config`.

Important keys:

- `access_level`
- `language_code`
- `request_budget.soft_monthly_limit`
- `request_budget.per_run_request_cap`
- `sports.<sport>.enabled`
- `sports.<sport>.allowed_competition_names`
- `sports.<sport>.schedule_days_ahead`
- `sports.<sport>.schedule_days_back`

Before enabling soccer in production, set `sports.soccer.allowed_competition_names` to the exact leagues you want to ingest.

## Admin trigger

The admin dashboard can now invoke:

- `schedule` sync
- `live` sync

That trigger uses the signed-in admin session and runs the actual ingestion server-side with the service role key.
