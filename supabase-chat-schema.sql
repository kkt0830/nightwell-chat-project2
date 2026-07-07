create extension if not exists pgcrypto;

create or replace function public.chat_is_guest()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

create or replace function public.chat_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.chat_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_guest boolean not null default false,
  display_name text not null,
  username text not null unique,
  bio text not null default '',
  theme_id text not null default 'moon-violet',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_profiles_username_format check (username ~ '^[a-z0-9_]{3,18}$'),
  constraint chat_profiles_display_name_length check (char_length(display_name) between 2 and 30),
  constraint chat_profiles_bio_length check (char_length(bio) <= 120)
);

create or replace function public.chat_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-z0-9_]', '', 'g'));
  requested_display_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'displayName', ''));
  fallback_suffix text := substr(replace(new.id::text, '-', ''), 1, 8);
  final_username text;
  final_display_name text;
begin
  if requested_username ~ '^[a-z0-9_]{3,18}$'
     and not exists (select 1 from public.chat_profiles where username = requested_username) then
    final_username := requested_username;
  else
    final_username := case when new.is_anonymous then 'guest_' else 'member_' end || fallback_suffix;
  end if;

  if requested_display_name <> '' then
    final_display_name := left(requested_display_name, 30);
  else
    final_display_name := case when new.is_anonymous then '게스트 ' else '사용자 ' end || substr(fallback_suffix, 1, 4);
  end if;

  insert into public.chat_profiles (user_id, is_guest, display_name, username)
  values (new.id, new.is_anonymous, final_display_name, final_username)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists chat_on_auth_user_created on auth.users;
create trigger chat_on_auth_user_created
after insert on auth.users
for each row
execute function public.chat_handle_new_user();

insert into public.chat_profiles (user_id, is_guest, display_name, username)
select
  u.id,
  u.is_anonymous,
  case
    when coalesce(btrim(u.raw_user_meta_data ->> 'display_name'), '') <> '' then left(btrim(u.raw_user_meta_data ->> 'display_name'), 30)
    when u.is_anonymous then '게스트 ' || substr(replace(u.id::text, '-', ''), 1, 4)
    else '사용자 ' || substr(replace(u.id::text, '-', ''), 1, 4)
  end,
  case
    when lower(regexp_replace(coalesce(u.raw_user_meta_data ->> 'username', ''), '[^a-z0-9_]', '', 'g')) ~ '^[a-z0-9_]{3,18}$'
      and not exists (
        select 1
        from public.chat_profiles cp
        where cp.username = lower(regexp_replace(coalesce(u.raw_user_meta_data ->> 'username', ''), '[^a-z0-9_]', '', 'g'))
      )
      then lower(regexp_replace(coalesce(u.raw_user_meta_data ->> 'username', ''), '[^a-z0-9_]', '', 'g'))
    else case when u.is_anonymous then 'guest_' else 'member_' end || substr(replace(u.id::text, '-', ''), 1, 8)
  end
from auth.users u
on conflict (user_id) do nothing;

drop trigger if exists chat_profiles_set_updated_at on public.chat_profiles;
create trigger chat_profiles_set_updated_at
before update on public.chat_profiles
for each row
execute function public.chat_set_updated_at();

create table if not exists public.chat_friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.chat_profiles (user_id) on delete cascade,
  addressee_id uuid not null references public.chat_profiles (user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  user_low uuid generated always as (least(requester_id, addressee_id)) stored,
  user_high uuid generated always as (greatest(requester_id, addressee_id)) stored,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_friendships_distinct_users check (requester_id <> addressee_id),
  constraint chat_friendships_pair_unique unique (user_low, user_high)
);

drop trigger if exists chat_friendships_set_updated_at on public.chat_friendships;
create trigger chat_friendships_set_updated_at
before update on public.chat_friendships
for each row
execute function public.chat_set_updated_at();

create table if not exists public.chat_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.chat_profiles (user_id) on delete cascade,
  blocked_id uuid not null references public.chat_profiles (user_id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chat_blocks_distinct_users check (blocker_id <> blocked_id),
  constraint chat_blocks_unique_pair unique (blocker_id, blocked_id)
);

create or replace function public.chat_is_blocked(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  room_type text not null check (room_type in ('general', 'random')),
  audience text not null check (audience in ('member', 'guest')),
  status text not null default 'active' check (status in ('active', 'closed')),
  created_by uuid references public.chat_profiles (user_id) on delete set null,
  pair_key text unique,
  target_size integer not null default 2 check (target_size = 2),
  created_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.chat_profiles (user_id) on delete cascade,
  alias text,
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  primary key (room_id, user_id)
);

create or replace function public.chat_is_room_member(p_room_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_room_members m
    where m.room_id = p_room_id
      and m.user_id = p_user_id
  );
$$;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender_id uuid references public.chat_profiles (user_id) on delete set null,
  message_type text not null default 'text' check (message_type in ('text', 'system')),
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chat_messages_body_length check (char_length(body) between 1 and 1000)
);

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.chat_profiles (user_id) on delete cascade,
  reported_user_id uuid not null references public.chat_profiles (user_id) on delete cascade,
  room_id uuid references public.chat_rooms (id) on delete set null,
  category text not null check (category in ('abuse', 'spam', 'sexual', 'other')),
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint chat_reports_distinct_users check (reporter_id <> reported_user_id),
  constraint chat_reports_description_length check (char_length(description) <= 240)
);

create table if not exists public.chat_random_queue (
  user_id uuid primary key references public.chat_profiles (user_id) on delete cascade,
  audience text not null check (audience in ('member', 'guest')),
  target_size integer not null default 2 check (target_size = 2),
  queued_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_friendships_requester_idx on public.chat_friendships (requester_id);
create index if not exists chat_friendships_addressee_idx on public.chat_friendships (addressee_id);
create index if not exists chat_blocks_blocker_idx on public.chat_blocks (blocker_id);
create index if not exists chat_room_members_user_idx on public.chat_room_members (user_id);
create index if not exists chat_messages_room_created_idx on public.chat_messages (room_id, created_at);
create index if not exists chat_reports_reporter_idx on public.chat_reports (reporter_id, created_at);
create index if not exists chat_random_queue_lookup_idx on public.chat_random_queue (audience, target_size, queued_at);

create or replace function public.chat_make_pair_key(p_user_a uuid, p_user_b uuid)
returns text
language sql
immutable
set search_path = public
as $$
  select least(p_user_a::text, p_user_b::text) || ':' || greatest(p_user_a::text, p_user_b::text);
$$;

create or replace function public.chat_generate_random_alias()
returns text
language plpgsql
set search_path = public
as $$
declare
  adjectives text[] := array['별빛', '은안개', '새벽', '달빛', '밤서리', '청금석', '잿빛', '고요한'];
  animals text[] := array['고양이', '호랑이', '사슴', '까마귀', '여우', '늑대', '고래', '올빼미'];
begin
  return adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
    || animals[1 + floor(random() * array_length(animals, 1))::int];
end;
$$;

create or replace function public.chat_open_general_room(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room_id uuid;
  v_pair_key text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if public.chat_is_guest() then
    raise exception 'Guest users cannot open general rooms';
  end if;

  if p_other_user_id = v_uid then
    raise exception 'Cannot open a room with yourself';
  end if;

  if exists (
    select 1
    from public.chat_profiles p
    where p.user_id = p_other_user_id
      and p.is_guest
  ) then
    raise exception 'Guest users cannot join general rooms';
  end if;

  if public.chat_is_blocked(v_uid, p_other_user_id) then
    raise exception 'Blocked users cannot open a room';
  end if;

  if not exists (
    select 1
    from public.chat_friendships f
    where f.status = 'accepted'
      and ((f.requester_id = v_uid and f.addressee_id = p_other_user_id)
        or (f.requester_id = p_other_user_id and f.addressee_id = v_uid))
  ) then
    raise exception 'Friendship required';
  end if;

  v_pair_key := public.chat_make_pair_key(v_uid, p_other_user_id);

  insert into public.chat_rooms (room_type, audience, created_by, pair_key, target_size)
  values ('general', 'member', v_uid, v_pair_key, 2)
  on conflict (pair_key) do update
    set status = 'active', closed_at = null
  returning id into v_room_id;

  insert into public.chat_room_members (room_id, user_id)
  values (v_room_id, v_uid), (v_room_id, p_other_user_id)
  on conflict do nothing;

  if not exists (
    select 1
    from public.chat_messages m
    where m.room_id = v_room_id
  ) then
    insert into public.chat_messages (room_id, sender_id, message_type, body)
    values (v_room_id, null, 'system', '일반 채팅방이 열렸습니다.');
  end if;

  return v_room_id;
end;
$$;

create or replace function public.chat_join_random_queue(p_target_size integer default 2)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room_id uuid;
  v_partner_id uuid;
  v_audience text;
  v_alias_self text;
  v_alias_partner text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_target_size <> 2 then
    raise exception 'Only 1:1 random chat is currently supported';
  end if;

  select r.id
  into v_room_id
  from public.chat_rooms r
  join public.chat_room_members m on m.room_id = r.id
  where r.room_type = 'random'
    and r.status = 'active'
    and m.user_id = v_uid
  order by r.created_at desc
  limit 1;

  if v_room_id is not null then
    return v_room_id;
  end if;

  v_audience := case when public.chat_is_guest() then 'guest' else 'member' end;

  insert into public.chat_random_queue (user_id, audience, target_size)
  values (v_uid, v_audience, p_target_size)
  on conflict (user_id) do update
    set audience = excluded.audience,
        target_size = excluded.target_size,
        queued_at = timezone('utc', now());

  select q.user_id
  into v_partner_id
  from public.chat_random_queue q
  where q.user_id <> v_uid
    and q.audience = v_audience
    and q.target_size = p_target_size
    and not public.chat_is_blocked(v_uid, q.user_id)
  order by q.queued_at asc
  limit 1
  for update skip locked;

  if v_partner_id is null then
    return null;
  end if;

  delete from public.chat_random_queue
  where user_id in (v_uid, v_partner_id);

  v_alias_self := public.chat_generate_random_alias();
  v_alias_partner := public.chat_generate_random_alias();

  while v_alias_self = v_alias_partner loop
    v_alias_partner := public.chat_generate_random_alias();
  end loop;

  insert into public.chat_rooms (room_type, audience, created_by, target_size)
  values ('random', v_audience, v_uid, p_target_size)
  returning id into v_room_id;

  insert into public.chat_room_members (room_id, user_id, alias)
  values
    (v_room_id, v_uid, v_alias_self),
    (v_room_id, v_partner_id, v_alias_partner);

  insert into public.chat_messages (room_id, sender_id, message_type, body)
  values (v_room_id, null, 'system', '익명 채팅이 시작되었습니다. 개인정보는 공유하지 마세요.');

  return v_room_id;
end;
$$;

create or replace function public.chat_leave_random_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  delete from public.chat_random_queue where user_id = v_uid;
end;
$$;

create or replace function public.chat_close_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.chat_is_room_member(p_room_id, v_uid) then
    raise exception 'Room membership required';
  end if;

  update public.chat_rooms
  set status = 'closed',
      closed_at = timezone('utc', now())
  where id = p_room_id;
end;
$$;

alter table public.chat_profiles enable row level security;
alter table public.chat_friendships enable row level security;
alter table public.chat_blocks enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;
alter table public.chat_random_queue enable row level security;

drop policy if exists "chat profiles readable" on public.chat_profiles;
create policy "chat profiles readable"
on public.chat_profiles
for select
to authenticated
using (
  auth.uid() = user_id
  or (
    public.chat_is_guest() is false
    and is_guest is false
  )
);

drop policy if exists "chat profiles update own" on public.chat_profiles;
create policy "chat profiles update own"
on public.chat_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and username ~ '^[a-z0-9_]{3,18}$'
  and char_length(display_name) between 2 and 30
  and char_length(bio) <= 120
);

drop policy if exists "chat profiles insert own" on public.chat_profiles;
create policy "chat profiles insert own"
on public.chat_profiles
for insert
to authenticated
with check (
  auth.uid() = user_id
  and username ~ '^[a-z0-9_]{3,18}$'
  and char_length(display_name) between 2 and 30
  and char_length(bio) <= 120
);

drop policy if exists "chat friendships select participant" on public.chat_friendships;
create policy "chat friendships select participant"
on public.chat_friendships
for select
to authenticated
using (auth.uid() in (requester_id, addressee_id));

drop policy if exists "chat friendships insert requester" on public.chat_friendships;
create policy "chat friendships insert requester"
on public.chat_friendships
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and public.chat_is_guest() is false
  and requester_id <> addressee_id
  and exists (
    select 1
    from public.chat_profiles p
    where p.user_id = addressee_id
      and p.is_guest is false
  )
);

drop policy if exists "chat friendships update participant" on public.chat_friendships;
create policy "chat friendships update participant"
on public.chat_friendships
for update
to authenticated
using (
  public.chat_is_guest() is false
  and auth.uid() in (requester_id, addressee_id)
)
with check (
  public.chat_is_guest() is false
  and auth.uid() in (requester_id, addressee_id)
  and status in ('pending', 'accepted', 'rejected')
);

drop policy if exists "chat blocks select blocker" on public.chat_blocks;
create policy "chat blocks select blocker"
on public.chat_blocks
for select
to authenticated
using (auth.uid() = blocker_id);

drop policy if exists "chat blocks insert blocker" on public.chat_blocks;
create policy "chat blocks insert blocker"
on public.chat_blocks
for insert
to authenticated
with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

drop policy if exists "chat blocks delete blocker" on public.chat_blocks;
create policy "chat blocks delete blocker"
on public.chat_blocks
for delete
to authenticated
using (auth.uid() = blocker_id);

drop policy if exists "chat rooms select member" on public.chat_rooms;
create policy "chat rooms select member"
on public.chat_rooms
for select
to authenticated
using (public.chat_is_room_member(id));

drop policy if exists "chat room members select room member" on public.chat_room_members;
create policy "chat room members select room member"
on public.chat_room_members
for select
to authenticated
using (public.chat_is_room_member(room_id));

drop policy if exists "chat messages select room member" on public.chat_messages;
create policy "chat messages select room member"
on public.chat_messages
for select
to authenticated
using (public.chat_is_room_member(room_id));

drop policy if exists "chat messages insert sender" on public.chat_messages;
create policy "chat messages insert sender"
on public.chat_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and message_type = 'text'
  and public.chat_is_room_member(room_id)
  and char_length(body) between 1 and 1000
);

drop policy if exists "chat reports select reporter" on public.chat_reports;
create policy "chat reports select reporter"
on public.chat_reports
for select
to authenticated
using (auth.uid() = reporter_id);

drop policy if exists "chat reports insert reporter" on public.chat_reports;
create policy "chat reports insert reporter"
on public.chat_reports
for insert
to authenticated
with check (
  auth.uid() = reporter_id
  and reporter_id <> reported_user_id
  and char_length(description) <= 240
);

drop policy if exists "chat random queue select own" on public.chat_random_queue;
create policy "chat random queue select own"
on public.chat_random_queue
for select
to authenticated
using (auth.uid() = user_id);

grant select, insert, update on public.chat_profiles to authenticated;
grant select, insert, update on public.chat_friendships to authenticated;
grant select, insert, delete on public.chat_blocks to authenticated;
grant select on public.chat_rooms to authenticated;
grant select on public.chat_room_members to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant select, insert on public.chat_reports to authenticated;
grant select on public.chat_random_queue to authenticated;

revoke execute on function public.chat_handle_new_user() from public, anon, authenticated;
revoke execute on function public.chat_is_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.chat_is_room_member(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.chat_is_guest() from public, anon, authenticated;
revoke execute on function public.chat_make_pair_key(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.chat_generate_random_alias() from public, anon, authenticated;
revoke execute on function public.chat_open_general_room(uuid) from public, anon;
revoke execute on function public.chat_join_random_queue(integer) from public, anon;
revoke execute on function public.chat_leave_random_queue() from public, anon;
revoke execute on function public.chat_close_room(uuid) from public, anon;
grant execute on function public.chat_open_general_room(uuid) to authenticated;
grant execute on function public.chat_join_random_queue(integer) to authenticated;
grant execute on function public.chat_leave_random_queue() to authenticated;
grant execute on function public.chat_close_room(uuid) to authenticated;
