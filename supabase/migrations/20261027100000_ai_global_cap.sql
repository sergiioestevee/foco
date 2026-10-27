-- Foco IA: a daily cap for all users together, on top of the per-user one.
-- Anonymous sign-ins make accounts cheap, so per-user limits alone can't protect the shared provider key.

create table public.ai_usage_global (
  day date primary key,
  count integer not null default 0 check (count >= 0)
);

-- RLS on and no policies: only the security-definer functions below touch it.
alter table public.ai_usage_global enable row level security;
revoke all on table public.ai_usage_global from anon, authenticated;

-- The return type changes (boolean → text), so the old function is replaced, not overloaded.
drop function public.consume_ai_quota(integer);

-- Counts one message for the caller and for the day. Returns 'ok', 'user_limit' or 'global_limit'.
-- The default keeps the previously deployed Edge Function (which sends only p_limit) working until it's redeployed.
create function public.consume_ai_quota(p_limit integer, p_global_limit integer default 1000)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Europe/Madrid')::date;
  v_global integer;
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500
    or p_global_limit is null or p_global_limit < 1 or p_global_limit > 100000 then
    raise exception 'invalid limit' using errcode = '22023';
  end if;

  insert into public.ai_usage_global as usage (day, count)
  values (v_day, 1)
  on conflict (day) do update
    set count = usage.count + 1
    where usage.count < p_global_limit
  returning usage.count into v_global;
  if v_global is null then
    return 'global_limit';
  end if;

  insert into public.ai_usage as usage (user_id, day, count)
  values (v_user, v_day, 1)
  on conflict (user_id, day) do update
    set count = usage.count + 1
    where usage.count < p_limit
  returning usage.count into v_count;
  if v_count is null then
    -- The user is over their own limit: give the global slot back.
    update public.ai_usage_global set count = count - 1 where day = v_day and count > 0;
    return 'user_limit';
  end if;

  return 'ok';
end;
$$;

revoke execute on function public.consume_ai_quota(integer, integer) from public, anon;
grant execute on function public.consume_ai_quota(integer, integer) to authenticated;

-- Refunds now also give the global slot back. Still callable only by the Edge Function's admin client.
create or replace function public.refund_ai_quota(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Europe/Madrid')::date;
begin
  update public.ai_usage
  set count = count - 1
  where user_id = p_user and day = v_day and count > 0;
  if found then
    update public.ai_usage_global set count = count - 1 where day = v_day and count > 0;
  end if;
end;
$$;

revoke execute on function public.refund_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_quota(uuid) to service_role;
