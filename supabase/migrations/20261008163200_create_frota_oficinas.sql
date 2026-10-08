create table public.frota_oficinas (
 id uuid primary key default gen_random_uuid(),
 prefeitura_id uuid not null references public.empresas(id),
 nome text not null check (length(trim(nome)) > 0),
 documento text check (documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$'),
 telefone text, responsavel text, endereco text, especialidades text, observacoes text,
 status text not null default 'active' check (status in ('active','inactive')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (id, prefeitura_id)
);
create index frota_oficinas_empresa_nome_idx on public.frota_oficinas(prefeitura_id,nome);
create unique index frota_oficinas_empresa_documento_idx on public.frota_oficinas(prefeitura_id,documento) where documento is not null;
alter table public.frota_oficinas enable row level security;
revoke all on public.frota_oficinas from anon, authenticated;
grant select, insert, update, delete on public.frota_oficinas to service_role;
comment on table public.frota_oficinas is 'Server-only access: actions validate module permissions and company scope; no direct client access.';
alter table public.frota_manutencoes add column oficina_id uuid;
alter table public.frota_manutencoes add constraint frota_manutencoes_oficina_empresa_fk foreign key (oficina_id,prefeitura_id) references public.frota_oficinas(id,prefeitura_id);
create index frota_manutencoes_oficina_empresa_idx on public.frota_manutencoes(oficina_id,prefeitura_id);
insert into public.permissoes(modulo_id,chave,nome,descricao)
select m.id,p.chave,p.nome,p.descricao from public.modulos m cross join
(values ('workshops.read','Visualizar oficinas','Permite consultar oficinas da empresa.'),
('workshops.manage','Gerenciar oficinas','Permite cadastrar, editar e inativar oficinas da empresa.')) as p(chave,nome,descricao)
where m.slug='frotas-publicas' and not exists(select 1 from public.permissoes x where x.modulo_id=m.id and x.chave=p.chave);
