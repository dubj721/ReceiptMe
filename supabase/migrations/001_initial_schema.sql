-- ============================================================
-- Receipt Manager — Initial Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Users (mirrors auth.users with app-specific fields)
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  name         text not null,
  country      text not null check (country in ('US', 'CA')) default 'US',
  concur_connected boolean not null default false,
  concur_token text,                        -- encrypted OAuth token
  created_at   timestamptz not null default now()
);

-- Receipts
create table public.receipts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  vendor_name       text not null,
  transaction_date  date not null,          -- 60-day clock starts here
  amount            numeric(10,2) not null,
  currency          text not null default 'USD',
  category          text not null check (category in ('meals','lodging','transit','other')),
  source            text not null check (source in ('photo','email','concur','bank_transaction','manual')),
  image_url         text,
  status            text not null check (status in ('active','overdue_flagged','archived')) default 'active',
  archived_at       timestamptz,
  notes             text,
  created_at        timestamptz not null default now()
);

-- Missing Receipt Forms (one per bank_transaction receipt)
create table public.missing_receipt_forms (
  id                uuid primary key default gen_random_uuid(),
  receipt_id        uuid not null unique references public.receipts(id) on delete cascade,
  business_purpose  text,
  reason            text,
  signature_url     text,
  completed_at      timestamptz,            -- null = form not yet submitted
  created_at        timestamptz not null default now()
);

-- Packets (grouped submission sets)
create table public.packets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  label        text not null,
  client_name  text,
  date_from    date not null,
  date_to      date not null,
  status       text not null check (status in ('draft','exported')) default 'draft',
  exported_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Packet ↔ Receipt join table
create table public.packet_receipts (
  id           uuid primary key default gen_random_uuid(),
  packet_id    uuid not null references public.packets(id) on delete cascade,
  receipt_id   uuid not null references public.receipts(id) on delete cascade,
  added_at     timestamptz not null default now(),
  unique(packet_id, receipt_id)
);

-- Notifications log
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  receipt_id   uuid not null references public.receipts(id) on delete cascade,
  type         text not null check (type in ('day_55_warning','day_60_overdue','day_61_archived')),
  channel      text not null check (channel in ('in_app','email')),
  sent_at      timestamptz not null default now(),
  read_at      timestamptz
);

-- ============================================================
-- Row Level Security
-- Users can only see and modify their own data
-- ============================================================

alter table public.users               enable row level security;
alter table public.receipts            enable row level security;
alter table public.missing_receipt_forms enable row level security;
alter table public.packets             enable row level security;
alter table public.packet_receipts     enable row level security;
alter table public.notifications       enable row level security;

-- users
create policy "Users: own row only"
  on public.users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- receipts
create policy "Receipts: own only"
  on public.receipts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- missing_receipt_forms (access via receipt ownership)
create policy "Forms: own receipts only"
  on public.missing_receipt_forms for all
  using (
    exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = auth.uid()
    )
  );

-- packets
create policy "Packets: own only"
  on public.packets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- packet_receipts
create policy "Packet receipts: own packets only"
  on public.packet_receipts for all
  using (
    exists (
      select 1 from public.packets p
      where p.id = packet_id and p.user_id = auth.uid()
    )
  );

-- notifications
create policy "Notifications: own only"
  on public.notifications for all
  using (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for receipt images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false);

create policy "Receipt images: own folder only"
  on storage.objects for all
  using (bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]);
