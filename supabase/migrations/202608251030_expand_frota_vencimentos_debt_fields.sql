alter table public.frota_vencimentos
  add column if not exists descricao text,
  add column if not exists valor numeric(12, 2),
  add column if not exists origem text not null default 'manual',
  add column if not exists external_ref text;

create index if not exists frota_vencimentos_origem_idx
on public.frota_vencimentos (origem);
