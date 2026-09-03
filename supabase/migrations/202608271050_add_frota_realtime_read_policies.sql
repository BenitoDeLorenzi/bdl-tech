alter table public.frota_veiculos enable row level security;
alter table public.frota_debito_consultas enable row level security;

drop policy if exists "frota_veiculos_realtime_read" on public.frota_veiculos;
create policy "frota_veiculos_realtime_read"
on public.frota_veiculos
for select
to authenticated
using (
  exists (
    select 1
    from public.perfis
    where perfis.id = auth.uid()
      and perfis.ativo is not false
      and (
        perfis.role = 'bdl_admin'
        or perfis.prefeitura_id = frota_veiculos.prefeitura_id
      )
  )
);

drop policy if exists "frota_debito_consultas_realtime_read" on public.frota_debito_consultas;
create policy "frota_debito_consultas_realtime_read"
on public.frota_debito_consultas
for select
to authenticated
using (
  exists (
    select 1
    from public.perfis
    where perfis.id = auth.uid()
      and perfis.ativo is not false
      and (
        perfis.role = 'bdl_admin'
        or perfis.prefeitura_id = frota_debito_consultas.prefeitura_id
      )
  )
);
