create table if not exists public.frota_secretarias (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  nome text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists frota_secretarias_prefeitura_nome_idx
  on public.frota_secretarias(prefeitura_id, lower(nome));

insert into public.frota_secretarias (prefeitura_id, nome, status)
select distinct v.prefeitura_id, trim(v.secretaria), 'active'
from public.frota_veiculos v
where trim(coalesce(v.secretaria, '')) <> ''
on conflict do nothing;

insert into public.permissoes (modulo_id, chave, nome, descricao)
select m.id, p.chave, p.nome, p.descricao
from public.modulos m
cross join (
  values
    ('departments.read', 'Visualizar secretarias', 'Permite consultar secretarias cadastradas.'),
    ('departments.manage', 'Gerenciar secretarias', 'Permite cadastrar, editar, ativar e inativar secretarias.')
) as p(chave, nome, descricao)
where m.slug = 'frotas-publicas'
on conflict (modulo_id, chave) do update
set nome = excluded.nome,
    descricao = excluded.descricao;
