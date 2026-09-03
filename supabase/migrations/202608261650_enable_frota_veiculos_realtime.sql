do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'frota_veiculos'
  ) then
    alter publication supabase_realtime add table public.frota_veiculos;
  end if;
end $$;

alter table public.frota_veiculos replica identity full;
grant select on public.frota_veiculos to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'frota_debito_consultas'
  ) then
    alter publication supabase_realtime add table public.frota_debito_consultas;
  end if;
end $$;

alter table public.frota_debito_consultas replica identity full;
grant select on public.frota_debito_consultas to authenticated;
