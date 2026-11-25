-- 11th Hour Restaurant — schema, security and order logic.
-- Run once on a fresh Supabase project (SQL editor or `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.order_status as enum ('new', 'preparing', 'ready', 'collected', 'not_collected');

-- ---------------------------------------------------------------------------
-- Staff (who may use the dashboard). Membership is granted by
-- scripts/create-staff.mjs using the service-role key.
-- ---------------------------------------------------------------------------
create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.dishes (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  description  text not null default '' check (char_length(description) <= 160),
  photo_url    text,
  is_available boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- opening_hours: array of 7 entries, index 0 = Sunday … 6 = Saturday.
-- Each entry: {"closed": bool, "open": "HH:MM", "close": "HH:MM", "note": text}
create table public.settings (
  id                    int primary key default 1 check (id = 1),
  min_price             int not null default 30 check (min_price > 0),
  step                  int not null default 10 check (step > 0),
  max_price             int not null default 100,
  accepting_orders      boolean not null default true,
  opening_hours         jsonb not null,
  not_collected_minutes int not null default 30 check (not_collected_minutes between 1 and 600),
  instagram_url         text,
  facebook_url          text,
  website               text,
  updated_at            timestamptz not null default now(),
  check (max_price >= min_price),
  check (jsonb_typeof(opening_hours) = 'array' and jsonb_array_length(opening_hours) = 7)
);

create table public.daily_counters (
  order_date  date primary key,
  last_number int not null
);

create table public.orders (
  id           uuid primary key default gen_random_uuid(),
  order_number int not null,
  order_date   date not null,
  first_name   text check (first_name is null or char_length(first_name) between 1 and 20),
  total        int not null check (total > 0),
  status       public.order_status not null default 'new',
  client_ref   uuid unique,           -- idempotency key so a retry on bad network can't double-order
  placed_at    timestamptz not null default now(),
  preparing_at timestamptz,
  ready_at     timestamptz,
  closed_at    timestamptz,
  unique (order_date, order_number)
);
create index orders_order_date_idx on public.orders (order_date);

create table public.order_items (
  id        bigint generated always as identity primary key,
  order_id  uuid not null references public.orders (id) on delete cascade,
  dish_id   uuid references public.dishes (id) on delete set null,
  dish_name text not null,
  amount    int not null check (amount > 0)
);
create index order_items_order_id_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Default settings row
-- ---------------------------------------------------------------------------
insert into public.settings (id, opening_hours, instagram_url, facebook_url, website)
values (
  1,
  '[
    {"closed": false, "open": "12:30", "close": "17:00", "note": "after service"},
    {"closed": true,  "open": "11:00", "close": "20:00", "note": ""},
    {"closed": false, "open": "11:00", "close": "20:00", "note": ""},
    {"closed": false, "open": "11:00", "close": "20:00", "note": ""},
    {"closed": false, "open": "11:00", "close": "20:00", "note": ""},
    {"closed": false, "open": "11:00", "close": "20:00", "note": ""},
    {"closed": false, "open": "11:00", "close": "20:00", "note": ""}
  ]'::jsonb,
  'https://www.instagram.com/',
  'https://www.facebook.com/',
  'https://lovecountrychurch.org'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Is the restaurant open right now (Africa/Accra, UTC+0)?
create or replace function public.is_open_now()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s      public.settings;
  v_now  timestamp := now() at time zone 'Africa/Accra';
  v_day  jsonb;
begin
  select * into s from public.settings where id = 1;
  if not found then return false; end if;
  v_day := s.opening_hours -> extract(dow from v_now)::int;
  if v_day is null or coalesce((v_day ->> 'closed')::boolean, false) then
    return false;
  end if;
  return v_now::time >= (v_day ->> 'open')::time
     and v_now::time <  (v_day ->> 'close')::time;
exception when others then
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- place_order(items, first_name[, client_ref])
--   items: [{"dish_id": "<uuid>", "amount": 40}, ...]
-- Validates everything server-side, assigns today's order number atomically,
-- and returns {id, order_number, total}.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(items jsonb, first_name text default null, client_ref uuid default null)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s          public.settings;
  v_today    date := (now() at time zone 'Africa/Accra')::date;
  v_name     text := nullif(btrim(coalesce(place_order.first_name, '')), '');
  v_item     jsonb;
  v_amount   numeric;
  v_dish_id  uuid;
  v_dish     public.dishes;
  v_valid    jsonb := '[]'::jsonb;
  v_total    int := 0;
  v_number   int;
  v_id       uuid;
  v_existing public.orders;
begin
  -- Idempotent retry: same client_ref returns the order already placed.
  if place_order.client_ref is not null then
    select * into v_existing from public.orders o where o.client_ref = place_order.client_ref;
    if found then
      return json_build_object('id', v_existing.id, 'order_number', v_existing.order_number, 'total', v_existing.total);
    end if;
  end if;

  select * into s from public.settings where id = 1;
  if not found or not s.accepting_orders then
    raise exception 'NOT_ACCEPTING';
  end if;
  if not public.is_open_now() then
    raise exception 'CLOSED';
  end if;

  if items is null or jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;
  if jsonb_array_length(items) > 20 then
    raise exception 'TOO_MANY_ITEMS';
  end if;
  if v_name is not null and char_length(v_name) > 20 then
    raise exception 'NAME_TOO_LONG';
  end if;

  for v_item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item -> 'amount') <> 'number' then
      raise exception 'INVALID_AMOUNT';
    end if;

    v_amount := (v_item ->> 'amount')::numeric;
    if v_amount <> trunc(v_amount)
       or v_amount < s.min_price
       or v_amount > s.max_price
       or mod(v_amount::int - s.min_price, s.step) <> 0 then
      raise exception 'INVALID_AMOUNT';
    end if;

    begin
      v_dish_id := (v_item ->> 'dish_id')::uuid;
    exception when others then
      raise exception 'DISH_UNAVAILABLE';
    end;

    select * into v_dish from public.dishes d where d.id = v_dish_id and d.is_available;
    if not found then
      raise exception 'DISH_UNAVAILABLE';
    end if;

    v_total := v_total + v_amount::int;
    v_valid := v_valid || jsonb_build_array(
      jsonb_build_object('dish_id', v_dish.id, 'dish_name', v_dish.name, 'amount', v_amount::int)
    );
  end loop;

  -- Atomic daily counter: the row lock taken by ON CONFLICT DO UPDATE means
  -- two simultaneous orders can never receive the same number.
  insert into public.daily_counters as c (order_date, last_number)
  values (v_today, 101)
  on conflict (order_date) do update set last_number = c.last_number + 1
  returning c.last_number into v_number;

  insert into public.orders (order_number, order_date, first_name, total, status, client_ref)
  values (v_number, v_today, v_name, v_total, 'new', place_order.client_ref)
  returning id into v_id;

  insert into public.order_items (order_id, dish_id, dish_name, amount)
  select v_id, (e ->> 'dish_id')::uuid, e ->> 'dish_name', (e ->> 'amount')::int
  from jsonb_array_elements(v_valid) e;

  return json_build_object('id', v_id, 'order_number', v_number, 'total', v_total);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_order(id): public read of ONE order by its unguessable uuid.
-- ---------------------------------------------------------------------------
create or replace function public.get_order(p_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'order_date', o.order_date,
    'first_name', o.first_name,
    'total', o.total,
    'status', o.status,
    'placed_at', o.placed_at,
    'preparing_at', o.preparing_at,
    'ready_at', o.ready_at,
    'closed_at', o.closed_at,
    'order_items', coalesce((
      select json_agg(json_build_object('dish_id', i.dish_id, 'dish_name', i.dish_name, 'amount', i.amount) order by i.id)
      from public.order_items i where i.order_id = o.id
    ), '[]'::json)
  )
  from public.orders o
  where o.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- set_order_status: staff only, enforces the allowed transitions.
--   new → preparing → ready → collected | not_collected
--   not_collected → collected   (customer turned up late and paid)
-- ---------------------------------------------------------------------------
create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status)
returns public.orders
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  if not public.is_staff() then
    raise exception 'NOT_STAFF' using errcode = '42501';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if not (
       (o.status = 'new'           and p_status = 'preparing')
    or (o.status = 'preparing'     and p_status = 'ready')
    or (o.status = 'ready'         and p_status in ('collected', 'not_collected'))
    or (o.status = 'not_collected' and p_status = 'collected')
  ) then
    raise exception 'BAD_TRANSITION';
  end if;

  update public.orders set
    status       = p_status,
    preparing_at = case when p_status = 'preparing' then now() else preparing_at end,
    ready_at     = case when p_status = 'ready' then now() else ready_at end,
    closed_at    = case when p_status in ('collected', 'not_collected') then now() else closed_at end
  where id = p_order_id
  returning * into o;

  return o;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer live status: broadcast on a public channel named "order:<uuid>".
-- Only someone who knows the uuid can subscribe to it.
-- ---------------------------------------------------------------------------
create or replace function public.broadcast_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'status', new.status,
      'preparing_at', new.preparing_at,
      'ready_at', new.ready_at,
      'closed_at', new.closed_at
    ),
    'status',
    'order:' || new.id::text,
    false
  );
  return new;
exception when others then
  -- Never block a status change because realtime is unavailable;
  -- the customer page also polls as a fallback.
  return new;
end;
$$;

create trigger orders_broadcast_status
after update of status on public.orders
for each row execute function public.broadcast_order_status();

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke all on function public.place_order(jsonb, text, uuid) from public;
revoke all on function public.get_order(uuid) from public;
revoke all on function public.set_order_status(uuid, public.order_status) from public;
revoke all on function public.broadcast_order_status() from public;
revoke all on function public.is_open_now() from public;

grant execute on function public.place_order(jsonb, text, uuid) to anon, authenticated;
grant execute on function public.get_order(uuid) to anon, authenticated;
grant execute on function public.is_open_now() to anon, authenticated;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.staff          enable row level security;
alter table public.dishes         enable row level security;
alter table public.settings       enable row level security;
alter table public.daily_counters enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- staff: a signed-in user can see whether they themselves are staff
create policy "staff read own row" on public.staff
  for select to authenticated using (user_id = auth.uid());

-- dishes: public sees available dishes; staff see and manage all
create policy "public read available dishes" on public.dishes
  for select to anon, authenticated using (is_available or public.is_staff());
create policy "staff insert dishes" on public.dishes
  for insert to authenticated with check (public.is_staff());
create policy "staff update dishes" on public.dishes
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff delete dishes" on public.dishes
  for delete to authenticated using (public.is_staff());

-- settings: public read, staff update
create policy "public read settings" on public.settings
  for select to anon, authenticated using (true);
create policy "staff update settings" on public.settings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- orders / items: staff read only. Inserts go through place_order(),
-- status changes through set_order_status(). The public reads one order
-- through get_order(uuid). daily_counters has no policies at all.
create policy "staff read orders" on public.orders
  for select to authenticated using (public.is_staff());
create policy "staff read order items" on public.order_items
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Realtime for the staff board (RLS applies, so only staff receive rows)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for dish photos, staff-only writes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dish-photos', 'dish-photos', true, 2097152, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "staff upload dish photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'dish-photos' and public.is_staff());
create policy "staff update dish photos" on storage.objects
  for update to authenticated using (bucket_id = 'dish-photos' and public.is_staff());
create policy "staff delete dish photos" on storage.objects
  for delete to authenticated using (bucket_id = 'dish-photos' and public.is_staff());

-- ---------------------------------------------------------------------------
-- Visits (to count menu QR-code scans: /?src=qr)
-- ---------------------------------------------------------------------------
create table public.visits (
  id         bigint generated always as identity primary key,
  visit_date date not null default ((now() at time zone 'Africa/Accra')::date),
  visited_at timestamptz not null default now(),
  source     text not null check (source in ('qr', 'direct'))
);
create index visits_date_source_idx on public.visits (visit_date, source);

alter table public.visits enable row level security;
create policy "staff read visits" on public.visits
  for select to authenticated using (public.is_staff());

create or replace function public.log_visit(p_source text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.visits (source)
  values (case when p_source = 'qr' then 'qr' else 'direct' end);
$$;

revoke all on function public.log_visit(text) from public;
grant execute on function public.log_visit(text) to anon, authenticated;
