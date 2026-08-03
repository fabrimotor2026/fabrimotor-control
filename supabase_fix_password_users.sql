-- FABRIMOTOR - Corrección tabla usuarios
-- Ejecutar en Supabase > SQL Editor si la columna password no existe

alter table public.fabrimotor_users
add column if not exists password text;

-- Opcional: copiar pin a password si ya había usuarios creados con pin
update public.fabrimotor_users
set password = coalesce(password, pin, '')
where password is null;
