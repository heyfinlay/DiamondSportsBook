# DBGP v3 Changelog

## Routes & Pages
- `/standings` now features driver, team, and race result tabs with season selector and settlement-aware data.
- `/account/settings` splits identity/auth management from the wallet page; `/account` focuses on balance, transactions, and funding requests.
- `/wagers` and `/wagers/:wagerId` provide a wager history hub plus transparent settlement breakdowns.
- `/active-markets` aliases the markets grid for deep links, and the nav removes demo links while adding a direct `Wagers` entry.
- `/admin/championship` centralizes season setup, team/driver rosters, and race results that power the public standings feed.

## Components & UX
- Added `FinalSettlementsTable`, `StandingsTabs`, and settlement-specific tables to reuse across market detail, admin audit, and wager detail views.
- Introduced `CharacterSetupGate` onboarding overlay to enforce character name + IC number before accessing the app.
- Live markets cards highlight status, total pool, time to close, and leading outcome at a glance; market detail switches to a “Final Settlements” view once settled.
- Account experiences now link to settings, expose warnings when IC phone data is missing, and show richer wager detail screens.
- Session setup’s “Load Championship Lineup” button now pulls the active season’s roster, surfaces reserve status badges, and auto-fills team colors via championship teams.

## Data & Backend
- `profiles` table gains an `ic_number` column synced from auth metadata; admin pending-deposit/withdraw tables surface character name, IC number, and phone.
- Added `settlement_get_pool_ledger(uuid)` RPC returning the full pool ledger (wins + losses) with distribution metadata for transparency.
- New React Query hooks consume `fetchPoolSettlementLedger` and `fetchSettlementSummary` for both public and admin settlement views.
- Removed the deprecated `ic_phone_number` column after backfilling `ic_number`, and updated the `get_dbgp_lineup` RPC to return driver status/season metadata that feeds admin tooling.
- `championship_results` keeps `display_label_mode` on each row and no longer references the deprecated `championship_result_id` column; `championship_drivers` and `championship_teams` now hold `manual_points`, `manual_position`, and `use_manual_override` so admins can curate manual leaderboards without auxiliary override tables.

## Follow-ups / Notes
- Consider extending Supabase RLS coverage review for the new ledger RPC to ensure desired public/admin visibility.
- Settlement audit detail currently shows approval user IDs; surface friendly names when admin directory endpoints become available.
