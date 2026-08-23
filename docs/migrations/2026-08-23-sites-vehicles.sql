-- LOST — multi-route sites + vehicle types
-- Run this in the Supabase SQL editor.

alter table public.routes
  add column if not exists site text,
  add column if not exists vehicle_type text,
  add column if not exists vehicle_icon text;

create index if not exists routes_user_site_idx on public.routes (user_id, site);
