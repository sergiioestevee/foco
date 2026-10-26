-- Foco IA: daily message quota per user, enforced by the foco-ai Edge Function.
-- The Gemini key is shared by everyone (free tier, limits per project), so each user gets a daily cap.

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

-- RLS on and no policies: the app can't read or write this table directly.
-- Only consume_ai_quota() below (security definer, scoped to auth.uid()) touches it.
alter table public.ai_usage enable row level security;
revoke all on table public.ai_usage from anon, authenticated;

-- Atomically counts one message for the calling user and returns false once the limit is reached.
-- Calling it directly only ever spends the caller's own quota.
create function public.consume_ai_quota(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'invalid limit' using errcode = '22023';
  end if;

  insert into public.ai_usage as usage (user_id, day, count)
  values (v_user, (now() at time zone 'Europe/Madrid')::date, 1)
  on conflict (user_id, day) do update
    set count = usage.count + 1
    where usage.count < p_limit
  returning usage.count into v_count;

  return v_count is not null;
end;
$$;

revoke execute on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
