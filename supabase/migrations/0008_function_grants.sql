-- Centralize function grants to keep earlier migrations compatible with Supabase CLI.
-- Note: Some functions may not exist yet if their migrations haven't run.
-- Use DO blocks to grant permissions safely.

do $$
begin
  grant execute on function public.timing_update_session_state(uuid, public.session_phase, public.track_status, bigint) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_create_session(text, text, integer, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_initialize_race(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_log_lap(uuid, integer, integer) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_invalidate_last_lap(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_log_penalty(uuid, uuid, text, integer) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_log_pit_event(uuid, integer) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.timing_delete_session_deep(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_preview_wager(uuid, uuid, numeric) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_place_wager(uuid, uuid, numeric, text) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_settle_market(uuid, uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_create_event_and_markets(text, uuid, numeric, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_open_market(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_close_market(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.betting_suspend_market(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_credit(uuid, numeric, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_debit(uuid, numeric, jsonb) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_request_deposit(numeric) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_request_withdrawal(numeric) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_approve_withdrawal(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_reject_withdrawal(uuid, text) to authenticated;
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  grant execute on function public.wallet_approve_deposit(uuid) to authenticated;
exception
  when undefined_function then null;
end;
$$;
