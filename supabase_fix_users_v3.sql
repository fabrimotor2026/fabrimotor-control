-- FABRIMOTOR - Corrección usuarios Supabase v3
-- Ejecutar en Supabase > SQL Editor

alter table public.fabrimotor_users
add column if not exists password text;

update public.fabrimotor_users
set password = coalesce(password, pin, '')
where password is null;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.fabrimotor_users'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role%';

  if constraint_name is not null then
    execute format('alter table public.fabrimotor_users drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.fabrimotor_users
add constraint fabrimotor_users_role_check
check (role in ('Operario', 'Mantenimiento', 'Calidad', 'Responsable', 'Administrador', 'Administrativo', 'Encargado'));

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
