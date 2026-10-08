create table public.gestao_colaboradores (
 id uuid primary key, empresa_id uuid not null, unidade_id uuid not null,
 nome text not null check(length(trim(nome)) between 2 and 120),
 funcao text not null check(length(trim(funcao)) between 2 and 80),
 telefone text not null default '' check(length(telefone)<=30),
 modalidade text not null check(modalidade in ('turno','diaria')),
 frequencia text not null check(frequencia in ('diaria','semanal')),
 valor numeric(12,2) not null check(valor>0 and valor<1000000000),
 ativo boolean not null default true, observacoes text not null default '' check(length(observacoes)<=1000),
 versao integer not null default 1, created_at timestamptz not null default now(),
 foreign key(empresa_id,unidade_id) references public.gestao_unidades(empresa_id,id),
 unique(empresa_id,unidade_id,id)
);
create index gestao_colaboradores_unidade_idx on public.gestao_colaboradores(unidade_id,nome);
create table public.gestao_equipe_pagamentos (
 id uuid primary key, empresa_id uuid not null, unidade_id uuid not null, colaborador_id uuid not null,
 colaborador_nome text not null, data date not null,
 forma text not null check(forma in ('Pix','Dinheiro','Transferência','Outro')),
 total numeric(14,2) not null check(total>0), itens jsonb not null,
 observacoes text not null default '' check(length(observacoes)<=1000),
 status text not null default 'pago' check(status in ('pago','estornado')),
 motivo_estorno text, versao integer not null default 1,
 criado_por uuid not null references public.perfis(id), created_at timestamptz not null default now(),
 foreign key(empresa_id,unidade_id,colaborador_id) references public.gestao_colaboradores(empresa_id,unidade_id,id),
 unique(empresa_id,unidade_id,id)
);
create index gestao_equipe_pagamentos_unidade_idx on public.gestao_equipe_pagamentos(unidade_id,data desc);
create index gestao_equipe_pagamentos_colaborador_idx on public.gestao_equipe_pagamentos(colaborador_id);
create table public.gestao_equipe_trabalhos (
 id uuid primary key, empresa_id uuid not null, unidade_id uuid not null, colaborador_id uuid not null,
 colaborador_nome text not null, funcao text not null,
 data date not null, modalidade text not null check(modalidade in ('turno','diaria')),
 turno text not null check(turno in ('manha','tarde','noite','dia_completo')),
 inicio time, fim time, valor numeric(12,2) not null check(valor>0 and valor<1000000000),
 observacoes text not null default '' check(length(observacoes)<=1000),
 cancelado boolean not null default false, motivo_cancelamento text,
 pagamento_id uuid, versao integer not null default 1,
 criado_por uuid not null references public.perfis(id), created_at timestamptz not null default now(),
 check((modalidade='diaria' and turno='dia_completo') or (modalidade='turno' and turno<>'dia_completo' and inicio is not null and fim is not null and inicio<>fim)),
 foreign key(empresa_id,unidade_id,colaborador_id) references public.gestao_colaboradores(empresa_id,unidade_id,id),
 foreign key(empresa_id,unidade_id,pagamento_id) references public.gestao_equipe_pagamentos(empresa_id,unidade_id,id)
);
create index gestao_equipe_trabalhos_unidade_idx on public.gestao_equipe_trabalhos(unidade_id,data desc);
create index gestao_equipe_trabalhos_colaborador_idx on public.gestao_equipe_trabalhos(colaborador_id,data);
create index gestao_equipe_trabalhos_pagamento_idx on public.gestao_equipe_trabalhos(pagamento_id);
create unique index gestao_equipe_trabalho_unico on public.gestao_equipe_trabalhos(colaborador_id,data,turno) where not cancelado;

create function gestao_private.empresas_equipe() returns setof uuid
language sql stable security definer set search_path='' as $$
 select e.id from public.empresas e where gestao_private.papel_gestao(auth.uid(),e.id)='gestor'
$$;
revoke all on function gestao_private.empresas_equipe() from public,anon;
grant execute on function gestao_private.empresas_equipe() to authenticated,service_role;
alter table public.gestao_colaboradores enable row level security;
alter table public.gestao_equipe_trabalhos enable row level security;
alter table public.gestao_equipe_pagamentos enable row level security;
revoke all on public.gestao_colaboradores,public.gestao_equipe_trabalhos,public.gestao_equipe_pagamentos from anon,authenticated;
grant select on public.gestao_colaboradores,public.gestao_equipe_trabalhos,public.gestao_equipe_pagamentos to authenticated;
grant all on public.gestao_colaboradores,public.gestao_equipe_trabalhos,public.gestao_equipe_pagamentos to service_role;
create policy equipe_colaboradores_leitura on public.gestao_colaboradores for select to authenticated using(empresa_id in(select gestao_private.empresas_equipe()));
create policy equipe_trabalhos_leitura on public.gestao_equipe_trabalhos for select to authenticated using(empresa_id in(select gestao_private.empresas_equipe()));
create policy equipe_pagamentos_leitura on public.gestao_equipe_pagamentos for select to authenticated using(empresa_id in(select gestao_private.empresas_equipe()));

create function public.gestao_equipe_operar(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare u uuid:=(p_dados->>'unidade_id')::uuid; e uuid; rid uuid:=(p_dados->>'id')::uuid;
 c public.gestao_colaboradores%rowtype; t public.gestao_equipe_trabalhos%rowtype; pg public.gestao_equipe_pagamentos%rowtype;
 cid uuid; v numeric; d date; ti time; tf time; mod text; tr text; mot text;
 ids uuid[]; item jsonb; snaps jsonb:='[]'; soma numeric:=0; anterior jsonb;
begin
 select empresa_id into e from public.gestao_unidades where id=u;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then raise exception 'Esta ação exige acesso de gestor à empresa com licença vigente.';end if;
 if rid is null then raise exception 'Identificação inválida.';end if;
 perform pg_advisory_xact_lock(hashtextextended(rid::text,0));
 if length(coalesce(p_dados->>'observacoes',''))>1000 then raise exception 'Use até 1.000 caracteres nas observações.';end if;
 if p_acao='colaborador' then
   select * into c from public.gestao_colaboradores where id=rid for update;
   if found then
     if c.unidade_id<>u then raise exception 'Colaborador de outra unidade.';end if;
     if c.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Cadastro alterado. Atualize a página.';end if;
     anterior:=to_jsonb(c);
   elsif coalesce((p_dados->>'versao')::integer,0)<>0 then raise exception 'Colaborador não encontrado.';
   end if;
   v:=(p_dados->>'valor')::numeric;
   if v is null or v::text in ('NaN','Infinity','-Infinity') or v<=0 or v>=1000000000 or v<>round(v,2) then raise exception 'Informe um valor positivo com até duas casas decimais.';end if;
   if length(trim(coalesce(p_dados->>'nome',''))) not between 2 and 120 or length(trim(coalesce(p_dados->>'funcao',''))) not between 2 and 80 then raise exception 'Informe nome e função válidos.';end if;
   insert into public.gestao_colaboradores(id,empresa_id,unidade_id,nome,funcao,telefone,modalidade,frequencia,valor,ativo,observacoes)
   values(rid,e,u,trim(p_dados->>'nome'),trim(p_dados->>'funcao'),coalesce(p_dados->>'telefone',''),p_dados->>'modalidade',p_dados->>'frequencia',v,coalesce((p_dados->>'ativo')::boolean,true),coalesce(p_dados->>'observacoes',''))
   on conflict(id) do update set nome=excluded.nome,funcao=excluded.funcao,telefone=excluded.telefone,modalidade=excluded.modalidade,frequencia=excluded.frequencia,valor=excluded.valor,ativo=excluded.ativo,observacoes=excluded.observacoes,versao=public.gestao_colaboradores.versao+1;
 elsif p_acao='trabalho' then
   cid:=(p_dados->>'colaborador_id')::uuid;
   select * into c from public.gestao_colaboradores where id=cid and unidade_id=u for update;
   if not found or not c.ativo then raise exception 'Selecione um colaborador ativo desta unidade.';end if;
   if exists(select 1 from public.gestao_equipe_trabalhos where id=rid) then raise exception 'Este lançamento já foi registrado. Atualize a página.';end if;
   d:=(p_dados->>'data')::date;mod:=p_dados->>'modalidade';tr:=p_dados->>'turno';v:=(p_dados->>'valor')::numeric;
   ti:=nullif(p_dados->>'inicio','')::time;tf:=nullif(p_dados->>'fim','')::time;
   if d is null or d>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Informe a data do trabalho realizado, até hoje.';end if;
   if v is null or v::text in ('NaN','Infinity','-Infinity') or v<=0 or v>=1000000000 or v<>round(v,2) then raise exception 'Informe um valor positivo com até duas casas decimais.';end if;
   if mod='diaria' then tr:='dia_completo';ti:=null;tf:=null;
   elsif mod='turno' then
     if ti is null or tf is null or ti=tf then raise exception 'Informe o horário de início e fim do turno.';end if;
   else raise exception 'Selecione turno ou diária.';end if;
   if exists(select 1 from public.gestao_equipe_trabalhos x where x.colaborador_id=cid and not x.cancelado and
     tsrange(case when x.modalidade='diaria' then x.data::timestamp else x.data+x.inicio end,
       case when x.modalidade='diaria' then x.data::timestamp+interval '1 day' else x.data+x.fim+case when x.fim<x.inicio then interval '1 day' else interval '0' end end,'[)') &&
     tsrange(case when mod='diaria' then d::timestamp else d+ti end,
       case when mod='diaria' then d::timestamp+interval '1 day' else d+tf+case when tf<ti then interval '1 day' else interval '0' end end,'[)')) then
     raise exception 'Já existe um trabalho deste colaborador nesse horário ou uma diária nesta data.';
   end if;
   insert into public.gestao_equipe_trabalhos(id,empresa_id,unidade_id,colaborador_id,colaborador_nome,funcao,data,modalidade,turno,inicio,fim,valor,observacoes,criado_por)
   values(rid,e,u,cid,c.nome,c.funcao,d,mod,tr,ti,tf,v,coalesce(p_dados->>'observacoes',''),p_ator);
 elsif p_acao='cancelar_trabalho' then
   select colaborador_id into cid from public.gestao_equipe_trabalhos where id=rid and unidade_id=u;
   perform 1 from public.gestao_colaboradores where id=cid for update;
   select * into t from public.gestao_equipe_trabalhos where id=rid and unidade_id=u for update;
   if not found then raise exception 'Trabalho não encontrado nesta unidade.';end if;
   if t.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Lançamento alterado. Atualize a página.';end if;
   if t.cancelado or t.pagamento_id is not null then raise exception 'Somente trabalhos pendentes podem ser cancelados.';end if;
   mot:=trim(coalesce(p_dados->>'motivo',''));if length(mot) not between 5 and 500 then raise exception 'Informe uma justificativa entre 5 e 500 caracteres.';end if;
   anterior:=to_jsonb(t);
   update public.gestao_equipe_trabalhos set cancelado=true,motivo_cancelamento=mot,versao=versao+1 where id=rid;
 elsif p_acao='pagar' then
   cid:=(p_dados->>'colaborador_id')::uuid;
   select * into c from public.gestao_colaboradores where id=cid and unidade_id=u for update;
   if not found then raise exception 'Colaborador não encontrado nesta unidade.';end if;
   if exists(select 1 from public.gestao_equipe_pagamentos where id=rid) then raise exception 'Este pagamento já foi registrado. Atualize a página.';end if;
   if jsonb_typeof(p_dados->'trabalhos') is distinct from 'array' or jsonb_array_length(p_dados->'trabalhos') not between 1 and 200 then raise exception 'Selecione de 1 a 200 trabalhos pendentes.';end if;
   select array_agg((value->>'id')::uuid) into ids from jsonb_array_elements(p_dados->'trabalhos');
   if (select count(distinct x) from unnest(ids) x)<>array_length(ids,1) then raise exception 'Há trabalhos repetidos.';end if;
   d:=(p_dados->>'data')::date;
   if d is null or d>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Informe a data do pagamento realizado, até hoje.';end if;
   for item in select value from jsonb_array_elements(p_dados->'trabalhos') order by value->>'id' loop
     select * into t from public.gestao_equipe_trabalhos where id=(item->>'id')::uuid and unidade_id=u and colaborador_id=cid for update;
     if not found or t.cancelado or t.pagamento_id is not null then raise exception 'Um dos trabalhos não está mais pendente. Atualize a página.';end if;
     if t.versao is distinct from (item->>'versao')::integer then raise exception 'Um dos trabalhos foi alterado. Atualize a página.';end if;
     if t.data>d then raise exception 'O pagamento não pode ser anterior ao trabalho selecionado.';end if;
     soma:=soma+t.valor;snaps:=snaps||jsonb_build_array(to_jsonb(t));
   end loop;
   insert into public.gestao_equipe_pagamentos(id,empresa_id,unidade_id,colaborador_id,colaborador_nome,data,forma,total,itens,observacoes,criado_por)
   values(rid,e,u,cid,c.nome,d,p_dados->>'forma',soma,snaps,coalesce(p_dados->>'observacoes',''),p_ator);
   update public.gestao_equipe_trabalhos set pagamento_id=rid,versao=versao+1 where id=any(ids);
 elsif p_acao='estornar_pagamento' then
   select colaborador_id into cid from public.gestao_equipe_pagamentos where id=rid and unidade_id=u;
   perform 1 from public.gestao_colaboradores where id=cid for update;
   select * into pg from public.gestao_equipe_pagamentos where id=rid and unidade_id=u for update;
   if not found then raise exception 'Pagamento não encontrado nesta unidade.';end if;
   if pg.status<>'pago' or pg.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Pagamento alterado ou já estornado. Atualize a página.';end if;
   mot:=trim(coalesce(p_dados->>'motivo',''));if length(mot) not between 5 and 500 then raise exception 'Informe uma justificativa entre 5 e 500 caracteres.';end if;
   anterior:=to_jsonb(pg);
   update public.gestao_equipe_trabalhos set pagamento_id=null,versao=versao+1 where pagamento_id=rid;
   update public.gestao_equipe_pagamentos set status='estornado',motivo_estorno=mot,versao=versao+1 where id=rid;
 else raise exception 'Operação inválida.';
 end if;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(e,p_ator,'equipe_'||p_acao,rid,jsonb_build_object('anterior',anterior,'solicitacao',p_dados));
 return rid;
end $$;
revoke all on function public.gestao_equipe_operar(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_equipe_operar(uuid,text,jsonb) to service_role;
