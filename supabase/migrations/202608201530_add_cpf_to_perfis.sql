alter table public.perfis
add column if not exists cpf text unique;

update public.perfis
set cpf = regexp_replace(username, '\D', '', 'g')
where cpf is null
  and username is not null
  and regexp_replace(username, '\D', '', 'g') ~ '^\d{11}$';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'perfis_cpf_digits_check'
  ) then
    alter table public.perfis
    add constraint perfis_cpf_digits_check
    check (cpf is null or cpf ~ '^\d{11}$');
  end if;
end $$;
