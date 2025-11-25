# DBGP v3 – Championship & Standings Management

## Overview
- `/admin/championship` is the new control panel for seasons, teams/drivers, and race results.
- The public `/standings` route, race results tab, and the session setup wizard now read from the same championship data.
- Supabase hosts canonical tables/views:
  - `championship_seasons`, `championship_teams`, `championship_drivers`, `championship_races`, `championship_results`
  - Views: `driver_standings_view`, `team_standings_view`, `race_results_view`, `championship_lineup_view`
  - RPC: `get_dbgp_lineup()` now returns driver/team colors plus status + season metadata.

## Admin Flow (`/admin/championship`)
1. **Seasons**
   - Create seasons (name, year) and set the active season (only `status = 'active'` feeds lineup/standings by default).
   - Current round metadata is editable for quick references.
2. **Teams & Drivers**
   - Teams include legacy timing IDs, short codes, and primary/secondary colors.
   - Drivers capture car numbers, statuses (`primary`, `reserve`, `inactive`), and team assignments.
   - Mutations invalidate React Query caches so the rest of the app sees changes immediately.
3. **Race Results**
   - Create rounds (round #, race name, circuit, date).
   - Classify drivers with finish position, grid slot, status text, gap, points, and fastest-lap flag.
   - Saving results pushes data into `championship_results`, which automatically recomputes the standings views.

## Standings Page
- The `/standings` page now fetches `championship_seasons` to populate the season selector (defaulting to the active season).
- Drivers, teams, and race results tabs are backed by the respective views, with loading/error states tied to the dynamic season ID.
- Race metadata cards show circuit/date info, and the filter pill reflects the latest classified round.

## Session Setup & Official Lineup
- The “Load Championship Lineup” button on `/admin/session-setup` refetches `get_dbgp_lineup()` on demand.
- Returned drivers include team colors + status; reserve drivers surface a badge in the form.
- When championship teams exist, selecting a team auto-fills the color pickers; otherwise it gracefully falls back to the legacy `teams` table.
- Driver payloads are sanitized before calling `timing_create_session_with_drivers` so only the expected props hit the RPC.

## Data Notes / Follow-ups
- `ic_phone_number` has been dropped in favor of the canonical `ic_number`; any flows blocking funding now key solely on `ic_number`.
- If the championship view/RPC is unavailable (e.g., first-time migrations), the lineup RPC returns an empty JSON array; the UI surfaces actionable messaging.
