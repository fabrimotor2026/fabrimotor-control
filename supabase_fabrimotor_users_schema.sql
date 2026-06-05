-- FABRIMOTOR - Tabla compartida de usuarios y roles
-- Ejecutar en Supabase > SQL Editor

create table if not exists public.fabrimotor_users (
  username text primary key,
  name text not null,
  role text not null check (role in ('Operario', 'Mantenimiento', 'Calidad', 'Responsable', 'Administrador', 'Administrativo')),
  pin text,
  active boolean default true,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists fabrimotor_users_role_idx
  on public.fabrimotor_users (role);

alter table public.fabrimotor_users enable row level security;

drop policy if exists "FABRIMOTOR read users" on public.fabrimotor_users;
create policy "FABRIMOTOR read users"
  on public.fabrimotor_users
  for select
  using (true);

drop policy if exists "FABRIMOTOR insert users" on public.fabrimotor_users;
create policy "FABRIMOTOR insert users"
  on public.fabrimotor_users
  for insert
  with check (true);

drop policy if exists "FABRIMOTOR update users" on public.fabrimotor_users;
create policy "FABRIMOTOR update users"
  on public.fabrimotor_users
  for update
  using (true)
  with check (true);

drop policy if exists "FABRIMOTOR delete users" on public.fabrimotor_users;
create policy "FABRIMOTOR delete users"
  on public.fabrimotor_users
  for delete
  using (true);

-- Cargar usuarios iniciales desde tu aplicación:
-- 1) Abre la app v3.4 con un Administrador.
-- 2) Pulsa "Actualizar usuarios".
-- 3) Si quieres que los usuarios actuales locales pasen a Supabase, usa Backup/Restaurar o crea/edita cada usuario desde Panel Administrador.
