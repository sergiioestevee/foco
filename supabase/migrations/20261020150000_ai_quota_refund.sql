-- Gives back today's message when foco-ai fails (provider down, unusable output).
-- Only the Edge Function may call it, through its server-side admin client: if the app could,
-- anyone could refund every message and skip the daily limit.

create function public.refund_ai_quota(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
  set count = count - 1
  where user_id = p_user
    and day = (now() at time zone 'Europe/Madrid')::date
    and count > 0;
$$;

revoke execute on function public.refund_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_quota(uuid) to service_role;
