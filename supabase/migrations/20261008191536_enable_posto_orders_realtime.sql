do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'frota_abastecimentos') then
    alter publication supabase_realtime add table public.frota_abastecimentos;
  end if;
end $$;
