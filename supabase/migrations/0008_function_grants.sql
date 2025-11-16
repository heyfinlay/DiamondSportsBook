-- Centralize function grants to keep earlier migrations compatible with Supabase CLI.

grant execute on function public.timing_update_session_state(uuid, public.session_phase, public.track_status, bigint) to authenticated;
grant execute on function public.timing_create_session(text, text, integer, jsonb) to authenticated;
grant execute on function public.timing_initialize_race(uuid) to authenticated;
grant execute on function public.timing_log_lap(uuid, integer, integer) to authenticated;

grant execute on function public.betting_preview_wager(uuid, uuid, numeric) to authenticated;
grant execute on function public.betting_place_wager(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.betting_settle_market(uuid, uuid) to authenticated;
grant execute on function public.betting_create_event_and_markets(text, uuid, numeric, jsonb) to authenticated;
grant execute on function public.betting_open_market(uuid) to authenticated;
grant execute on function public.betting_close_market(uuid) to authenticated;
grant execute on function public.betting_suspend_market(uuid) to authenticated;

grant execute on function public.wallet_credit(uuid, numeric, jsonb) to authenticated;
grant execute on function public.wallet_debit(uuid, numeric, jsonb) to authenticated;
grant execute on function public.wallet_request_deposit(numeric) to authenticated;
grant execute on function public.wallet_request_withdrawal(numeric) to authenticated;
grant execute on function public.wallet_approve_withdrawal(uuid) to authenticated;
grant execute on function public.wallet_reject_withdrawal(uuid) to authenticated;
grant execute on function public.wallet_approve_deposit(uuid) to authenticated;
