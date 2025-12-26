-- ==============================================================================
-- [FIX] 0. Create Restaurants Table First! (이 부분이 없어서 에러가 났습니다)
-- ==============================================================================
create table if not exists public.restaurants (
  id uuid not null default gen_random_uuid() primary key,
  name text not null, -- 가게 이름 (예: Collegiate Grill)
  subdomain text unique, -- 접속 주소 (예: grill-01)
  is_active boolean default true,
  created_at timestamptz not null default now()
);

-- RLS 활성화 (필수)
alter table public.restaurants enable row level security;


-- ==============================================================================
-- 1. SaaS Foundation: Store Members (User <-> Restaurant Relationship)
-- ==============================================================================
create table if not exists public.store_members (
  id uuid not null default gen_random_uuid() primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  
  constraint store_members_uniq unique (restaurant_id, user_id)
);

-- Enable RLS
alter table public.store_members enable row level security;

-- Policy: Users can view their own memberships
create policy "Users can view own memberships"
  on public.store_members for select
  using (auth.uid() = user_id);


-- ==============================================================================
-- 2. Helper Function (Security & Performance Optimized)
-- ==============================================================================
create or replace function public.is_member_of(_restaurant_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.store_members
    where restaurant_id = _restaurant_id
    and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer 
set search_path = public; -- Security Fix


-- ==============================================================================
-- 3. Schema Migration: Add restaurant_id to Sales Tables
-- ==============================================================================

-- [Check 1] Orders Table (테이블이 이미 존재한다고 가정)
-- 만약 Orders 테이블도 없다면 create table 문이 필요합니다.
do $$
begin
  -- 테이블이 있는지 확인
  if exists (select 1 from information_schema.tables where table_name = 'orders') then
    -- 컬럼이 없으면 추가
    if not exists (select 1 from information_schema.columns where table_name = 'orders' and column_name = 'restaurant_id') then
      alter table public.orders add column restaurant_id uuid references public.restaurants(id);
      create index idx_orders_restaurant_id on public.orders(restaurant_id);
    end if;
  end if;
end $$;

-- [Check 2] Order Items Table
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'order_items') then
    if not exists (select 1 from information_schema.columns where table_name = 'order_items' and column_name = 'restaurant_id') then
      alter table public.order_items add column restaurant_id uuid references public.restaurants(id);
      create index idx_order_items_restaurant_id on public.order_items(restaurant_id);
    end if;
  end if;
end $$;


-- ==============================================================================
-- 4. RLS Implementation (Policies)
-- ==============================================================================

-- [Restaurants]
-- 기존 정책이 있으면 에러가 날 수 있으므로 drop 후 create (안전장치)
drop policy if exists "Members can view their own restaurant" on public.restaurants;
create policy "Members can view their own restaurant"
  on public.restaurants for select
  using (is_member_of(id));

-- [Menu Data: Categories, Items] 
-- (주의: categories, items 테이블도 없으면 에러가 납니다. 여기서는 있다고 가정합니다)
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'categories') then
    alter table public.categories enable row level security;
    drop policy if exists "Public can view categories" on public.categories;
    create policy "Public can view categories" on public.categories for select using (true);
    
    drop policy if exists "Members can manage categories" on public.categories;
    create policy "Members can manage categories" on public.categories for all using (is_member_of(restaurant_id));
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'items') then
    alter table public.items enable row level security;
    drop policy if exists "Public can view items" on public.items;
    create policy "Public can view items" on public.items for select using (true);
    
    drop policy if exists "Members can manage items" on public.items;
    create policy "Members can manage items" on public.items for all using (is_member_of(restaurant_id));
  end if;
end $$;

-- [Orders]
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'orders') then
    alter table public.orders enable row level security;
    
    drop policy if exists "Members can view orders" on public.orders;
    create policy "Members can view orders" on public.orders for select using (is_member_of(restaurant_id));

    drop policy if exists "Public can place orders" on public.orders;
    create policy "Public can place orders" on public.orders for insert with check (restaurant_id is not null);  
  end if;
end $$;

-- [Order Items]
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'order_items') then
    alter table public.order_items enable row level security;
    
    drop policy if exists "Members can view order items" on public.order_items;
    create policy "Members can view order items" on public.order_items for select using (is_member_of(restaurant_id)); 

    drop policy if exists "Public can insert order items" on public.order_items;
    create policy "Public can insert order items" on public.order_items for insert with check (restaurant_id is not null);
  end if;
end $$;
