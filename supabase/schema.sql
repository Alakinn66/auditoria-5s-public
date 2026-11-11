-- Auditoría 5S — esquema de Supabase (Postgres)
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- Crea las tablas de auditorías, criterios y fotos, activa RLS con
-- políticas públicas de lectura/escritura para el rol anon, y crea el
-- bucket público "evidencias" para las fotos.
--
-- ATENCIÓN: esta app es pública por diseño (cualquiera con el enlace y el
-- PIN puede ver y enviar auditorías). Las políticas de abajo lo reflejan.
-- Para privacidad real habría que usar Supabase Auth; ver README.

-- Tablas ---------------------------------------------------------------

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  area text not null,
  sub_area text not null,
  auditor text not null,
  supervisor text not null,
  average numeric(4, 2) not null,
  total_score integer not null
);

create table if not exists public.audit_items (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  s_index integer not null,        -- 0..4  (fase 1S..5S)
  criterion_index integer not null, -- 0..19 (posición del criterio)
  criterion_title text not null,
  score integer not null check (score between 0 and 5),
  comment text not null default ''
);

create table if not exists public.audit_photos (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  criterion_index integer not null, -- 0..19
  url text not null,
  storage_path text
);

create index if not exists audit_items_audit_id_idx on public.audit_items (audit_id);
create index if not exists audit_photos_audit_id_idx on public.audit_photos (audit_id);
create index if not exists audits_created_at_idx on public.audits (created_at desc);

-- Row Level Security (políticas públicas para el rol anon) --------------

alter table public.audits enable row level security;
alter table public.audit_items enable row level security;
alter table public.audit_photos enable row level security;

drop policy if exists "public read audits" on public.audits;
create policy "public read audits" on public.audits
  for select using (true);

drop policy if exists "public insert audits" on public.audits;
create policy "public insert audits" on public.audits
  for insert with check (true);

drop policy if exists "public delete audits" on public.audits;
create policy "public delete audits" on public.audits
  for delete using (true);

drop policy if exists "public read audit_items" on public.audit_items;
create policy "public read audit_items" on public.audit_items
  for select using (true);

drop policy if exists "public insert audit_items" on public.audit_items;
create policy "public insert audit_items" on public.audit_items
  for insert with check (true);

drop policy if exists "public read audit_photos" on public.audit_photos;
create policy "public read audit_photos" on public.audit_photos
  for select using (true);

drop policy if exists "public insert audit_photos" on public.audit_photos;
create policy "public insert audit_photos" on public.audit_photos
  for insert with check (true);

drop policy if exists "public delete audit_photos" on public.audit_photos;
create policy "public delete audit_photos" on public.audit_photos
  for delete using (true);

-- Bucket de Storage para las fotos de evidencia -----------------------
-- Si prefieres crearlo a mano: Storage > New bucket > nombre
-- "evidencias", marcarlo como Public.

insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

drop policy if exists "public read evidencias" on storage.objects;
create policy "public read evidencias" on storage.objects
  for select using (bucket_id = 'evidencias');

drop policy if exists "public upload evidencias" on storage.objects;
create policy "public upload evidencias" on storage.objects
  for insert with check (bucket_id = 'evidencias');

drop policy if exists "public delete evidencias" on storage.objects;
create policy "public delete evidencias" on storage.objects
  for delete using (bucket_id = 'evidencias');
