-- Foco: one row per synced record (subject, task, profile…) per user.
-- Security model: Row Level Security on, every policy scoped to the signed-in user,
-- default grants revoked so only what is granted below is possible.

create table public.user_records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entity text not null check (
    entity in ('subject', 'project', 'task', 'exam', 'goal', 'scheduleBlock', 'studyBlock', 'profile', 'settings')
  ),
  id text not null check (char_length(id) between 1 and 100),
  data jsonb check (data is null or octet_length(data::text) <= 65536),
  deleted boolean not null default false,
  -- Client time of the edit: decides conflicts (last write wins).
  updated_at timestamptz not null,
  -- Server time of the write: cursor for incremental pulls, immune to device clock drift.
  server_updated_at timestamptz not null default now(),
  primary key (user_id, entity, id),
  check (deleted or data is not null)
);

create index user_records_user_id_server_updated_at_idx
  on public.user_records using btree (user_id, server_updated_at);

-- Row Level Security: a user can only ever see and change their own rows.
alter table public.user_records enable row level security;

create policy "Users can read their own records"
  on public.user_records for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own records"
  on public.user_records for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own records"
  on public.user_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own records"
  on public.user_records for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Policies don't remove the default grants, so take everything back and grant only what the app needs.
revoke all on table public.user_records from anon, authenticated;
grant select, insert, update, delete on table public.user_records to authenticated;

-- The server, not the client, stamps server_updated_at.
create function public.set_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

create trigger user_records_set_server_updated_at
  before insert or update on public.user_records
  for each row execute function public.set_server_updated_at();

-- Batch upsert used by the app. Runs as the caller (security invoker), so RLS still applies,
-- and only overwrites a row when the incoming edit is at least as recent as the stored one.
create function public.push_user_records(records jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.user_records as existing (user_id, entity, id, data, deleted, updated_at)
  select (select auth.uid()), r.entity, r.id, r.data, r.deleted, r.updated_at
  from jsonb_to_recordset(records) as r (entity text, id text, data jsonb, deleted boolean, updated_at timestamptz)
  on conflict (user_id, entity, id) do update
    set data = excluded.data,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at
    where existing.updated_at <= excluded.updated_at;
$$;

revoke execute on function public.push_user_records(jsonb) from public, anon;
grant execute on function public.push_user_records(jsonb) to authenticated;
