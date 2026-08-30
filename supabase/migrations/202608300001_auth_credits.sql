create table if not exists public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 5 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  search_query text not null check (char_length(search_query) between 1 and 160),
  search_location text not null check (char_length(search_location) between 1 and 120),
  ai_retry_used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists analysis_runs_user_created_idx
  on public.analysis_runs (user_id, created_at desc);

alter table public.user_credits enable row level security;
alter table public.analysis_runs enable row level security;

revoke all on table public.user_credits from anon, authenticated;
revoke all on table public.analysis_runs from anon, authenticated;

grant select on table public.user_credits to authenticated;
grant select on table public.analysis_runs to authenticated;

drop policy if exists "Users can read their own credits" on public.user_credits;
create policy "Users can read their own credits"
  on public.user_credits
  for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read their own analysis runs" on public.analysis_runs;
create policy "Users can read their own analysis runs"
  on public.analysis_runs
  for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_credits (user_id, credits)
  values (new.id, 5)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user_credits() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_add_credits on auth.users;
create trigger on_auth_user_created_add_credits
  after insert on auth.users
  for each row execute function public.handle_new_user_credits();

insert into public.user_credits (user_id, credits)
select id, 5
from auth.users
on conflict (user_id) do nothing;

create or replace function public.consume_analysis_credit(
  query_text text,
  location_text text
)
returns table (run_id uuid, remaining_credits integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  created_run_id uuid := gen_random_uuid();
  next_credits integer;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if char_length(query_text) not between 1 and 160
    or char_length(location_text) not between 1 and 120 then
    raise exception 'invalid analysis metadata' using errcode = '22023';
  end if;

  update public.user_credits
  set credits = credits - 1,
      updated_at = now()
  where user_id = current_user_id
    and credits > 0
  returning credits into next_credits;

  if not found then
    return;
  end if;

  insert into public.analysis_runs (
    id,
    user_id,
    search_query,
    search_location
  ) values (
    created_run_id,
    current_user_id,
    query_text,
    location_text
  );

  return query select created_run_id, next_credits;
end;
$$;

revoke execute on function public.consume_analysis_credit(text, text) from public, anon;
grant execute on function public.consume_analysis_credit(text, text) to authenticated;

create or replace function public.claim_ai_retry(run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  claimed boolean := false;
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  update public.analysis_runs
  set ai_retry_used = true
  where id = run_id
    and user_id = current_user_id
    and ai_retry_used = false
  returning true into claimed;

  return coalesce(claimed, false);
end;
$$;

revoke execute on function public.claim_ai_retry(uuid) from public, anon;
grant execute on function public.claim_ai_retry(uuid) to authenticated;

comment on table public.user_credits is 'Server-controlled analysis credit balance for each authenticated user.';
comment on table public.analysis_runs is 'Minimal audit record linking a paid analysis to one optional AI retry.';
