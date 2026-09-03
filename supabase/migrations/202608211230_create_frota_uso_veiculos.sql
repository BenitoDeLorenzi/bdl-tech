create table if not exists public.frota_motoristas (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  nome text not null,
  cpf text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists frota_motoristas_prefeitura_cpf_idx
  on public.frota_motoristas(prefeitura_id, cpf)
  where cpf is not null and cpf <> '';

create index if not exists frota_motoristas_prefeitura_nome_idx
  on public.frota_motoristas(prefeitura_id, nome);

create table if not exists public.frota_uso_veiculos (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null references public.prefeituras(id) on delete cascade,
  veiculo_id uuid not null references public.frota_veiculos(id) on delete cascade,
  motorista_id uuid references public.frota_motoristas(id) on delete set null,
  funcionario_nome text not null,
  funcionario_cpf text,
  data_saida timestamptz not null default now(),
  km_saida integer not null,
  destino text,
  finalidade text,
  observacoes_saida text,
  data_retorno timestamptz,
  km_retorno integer,
  observacoes_retorno text,
  status text not null default 'in_use' check (status in ('in_use', 'returned', 'cancelled')),
  created_by uuid references public.perfis(id) on delete set null,
  returned_by uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists frota_uso_veiculos_one_active_per_vehicle_idx
  on public.frota_uso_veiculos(veiculo_id)
  where status = 'in_use';

create index if not exists frota_uso_veiculos_prefeitura_status_idx
  on public.frota_uso_veiculos(prefeitura_id, status);

create index if not exists frota_uso_veiculos_veiculo_idx
  on public.frota_uso_veiculos(veiculo_id);

create index if not exists frota_uso_veiculos_motorista_idx
  on public.frota_uso_veiculos(motorista_id);

insert into public.permissoes (modulo_id, chave, nome, descricao)
select m.id, p.chave, p.nome, p.descricao
from public.modulos m
cross join (
  values
    ('vehicle_usage.read', 'Visualizar uso do veículo', 'Permite visualizar retiradas e devoluções de veículos.'),
    ('vehicle_usage.create', 'Registrar retirada', 'Permite registrar a saída de um veículo da garagem.'),
    ('vehicle_usage.return', 'Registrar devolução', 'Permite registrar a devolução de um veículo.'),
    ('vehicle_usage.cancel', 'Cancelar retirada', 'Permite cancelar uma retirada registrada indevidamente.')
) as p(chave, nome, descricao)
where m.slug = 'frotas-publicas'
  and not exists (
    select 1
    from public.permissoes existing
    where existing.modulo_id = m.id
      and existing.chave = p.chave
  );
