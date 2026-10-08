-- Financial records are service-written, tenant-scoped and retained on reversal.
create table public.gestao_fin_config (
 unidade_id uuid primary key references public.gestao_unidades(id),
 inicio date not null, criado_por uuid not null references public.perfis(id), created_at timestamptz not null default now()
);
create table public.gestao_contas (
 id uuid primary key default gen_random_uuid(), unidade_id uuid not null references public.gestao_unidades(id),
 nome text not null check(length(trim(nome)) between 2 and 100), tipo text not null check(tipo in ('caixa','banco','cartoes')),
 ativo boolean not null default true, created_at timestamptz not null default now(), unique(unidade_id,nome), unique(id,unidade_id)
);
create table public.gestao_contas_pagar (
 id uuid primary key default gen_random_uuid(), unidade_id uuid not null references public.gestao_unidades(id),
 descricao text not null check(length(trim(descricao)) between 2 and 200), categoria text not null default 'Outras despesas',
 fornecedor text not null default '', observacoes text not null default '', vencimento date not null,
 valor numeric(14,2) not null check(valor>0 and valor<1000000000), cancelada boolean not null default false,
 fechamento_id uuid references public.gestao_fechamentos(id) on delete set null,
 criado_por uuid not null references public.perfis(id), created_at timestamptz not null default now(), unique(id,unidade_id)
);
create table public.gestao_contas_receber (
 id uuid primary key default gen_random_uuid(), unidade_id uuid not null references public.gestao_unidades(id),
 conta_id uuid not null, descricao text not null, data date not null, previsao date not null,
 valor numeric(14,2) not null check(valor>0 and valor<1000000000), cancelada boolean not null default false,
 fechamento_id uuid references public.gestao_fechamentos(id) on delete set null,
 foreign key(conta_id,unidade_id) references public.gestao_contas(id,unidade_id), unique(id,unidade_id)
);
create table public.gestao_fin_movimentos (
 id uuid primary key default gen_random_uuid(), grupo uuid not null, unidade_id uuid not null references public.gestao_unidades(id),
 conta_id uuid not null, data date not null, valor numeric(14,2) not null check(valor<>0 and abs(valor)<1000000000),
 tipo text not null check(tipo in ('inicial','aporte','retirada','ajuste_entrada','ajuste_saida','transferencia','venda','cartao','recebimento','despesa','equipe')),
 descricao text not null, fechamento_id uuid references public.gestao_fechamentos(id) on delete set null,
 pagar_id uuid, receber_id uuid, estornado boolean not null default false, motivo_estorno text,
 criado_por uuid not null references public.perfis(id), created_at timestamptz not null default now(),
 foreign key(conta_id,unidade_id) references public.gestao_contas(id,unidade_id),
 foreign key(pagar_id,unidade_id) references public.gestao_contas_pagar(id,unidade_id),
 foreign key(receber_id,unidade_id) references public.gestao_contas_receber(id,unidade_id)
);
create index on public.gestao_contas_pagar(unidade_id,vencimento);
create index on public.gestao_contas_pagar(fechamento_id);
create index on public.gestao_contas_receber(unidade_id,previsao);
create index on public.gestao_contas_receber(fechamento_id);
create index on public.gestao_contas_receber(conta_id,unidade_id);
create index on public.gestao_fin_movimentos(unidade_id,data);
create index on public.gestao_fin_movimentos(conta_id) where not estornado;
create index on public.gestao_fin_movimentos(pagar_id) where not estornado;
create index on public.gestao_fin_movimentos(receber_id) where not estornado;
create index on public.gestao_fin_movimentos(fechamento_id);
create index on public.gestao_fin_movimentos(grupo);
alter table public.gestao_fechamentos add column financeiro jsonb not null default '{}', add column financeiro_gerado boolean not null default false, add column financeiro_legado boolean not null default false;
create function gestao_private.fin_master() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfis where id=(select auth.uid()) and ativo and role::text='bdl_admin');
$$;
revoke all on function gestao_private.fin_master() from public,anon;
grant execute on function gestao_private.fin_master() to authenticated,service_role;
do $$ declare t text; begin
 foreach t in array array['gestao_fin_config','gestao_contas','gestao_contas_pagar','gestao_contas_receber','gestao_fin_movimentos'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy financeiro_leitura on public.%I for select to authenticated using((select gestao_private.fin_master()) and unidade_id in(select u.id from public.gestao_unidades u where u.empresa_id in(select gestao_private.empresas_equipe())))',t);
 end loop;
end $$;

create view public.gestao_contas_saldos with(security_invoker=true) as
 select c.*,coalesce((select sum(m.valor) from public.gestao_fin_movimentos m where m.conta_id=c.id and not m.estornado),0) as saldo from public.gestao_contas c;
create view public.gestao_pagar_saldos with(security_invoker=true) as
 select p.*,coalesce((select -sum(m.valor) from public.gestao_fin_movimentos m where m.pagar_id=p.id and not m.estornado),0) as pago from public.gestao_contas_pagar p;
create view public.gestao_receber_saldos with(security_invoker=true) as
 select r.*,coalesce((select sum(m.valor) from public.gestao_fin_movimentos m where m.receber_id=r.id and m.tipo='recebimento' and m.valor>0 and not m.estornado),0) as recebido from public.gestao_contas_receber r;
revoke all on public.gestao_contas_saldos,public.gestao_pagar_saldos,public.gestao_receber_saldos from anon,authenticated;
grant select on public.gestao_contas_saldos,public.gestao_pagar_saldos,public.gestao_receber_saldos to authenticated,service_role;

create function gestao_private.fin_conta(u uuid,c uuid,cartao boolean default false) returns uuid
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.gestao_contas where id=c and unidade_id=u and ativo and (cartao or tipo<>'cartoes')) then raise exception 'Selecione uma conta ativa desta unidade, compatível com o lançamento.';end if;
 return c;
end $$;
revoke all on function gestao_private.fin_conta(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function gestao_private.fin_conta(uuid,uuid,boolean) to service_role;

create function public.gestao_fin_operar(p_ator uuid,p_unidade uuid,p_acao text,p_dados jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare e uuid; inicio date; dia date; v numeric; c uuid; destino uuid; rid uuid; grupo uuid; descricao text;
 p public.gestao_contas_pagar%rowtype; r public.gestao_contas_receber%rowtype; restante numeric;
begin
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' or not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then raise exception 'Esta ação exige um gestor com acesso vigente à unidade.';end if;
 -- One lock per unit also serializes closing integration, reversals and payment limits.
 perform pg_advisory_xact_lock(hashtextextended(p_unidade::text||':financeiro',0));
 grupo:=coalesce((p_dados->>'requisicao')::uuid,gen_random_uuid());
 if exists(select 1 from public.gestao_auditoria where registro_id=grupo and empresa_id=e and acao='financeiro_'||p_acao) then return grupo;end if;
 select f.inicio into inicio from public.gestao_fin_config f where unidade_id=p_unidade;
 dia:=coalesce(nullif(p_dados->>'data','')::date,(now() at time zone 'America/Sao_Paulo')::date);
 descricao:=trim(coalesce(p_dados->>'descricao',''));
 if p_acao='ativar' then
   if inicio is not null then raise exception 'O financeiro já foi ativado.';end if;
   if dia>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'A data inicial não pode estar no futuro.';end if;
   if exists(select 1 from public.gestao_fechamentos where unidade_id=p_unidade and status='conferido' and data>=dia) then raise exception 'Escolha uma data posterior ao último fechamento confirmado. Os saldos iniciais devem incluir os movimentos anteriores.';end if;
   insert into public.gestao_fin_config values(p_unidade,dia,p_ator,now());
   foreach descricao in array array['Caixa','Banco / Pix','Cartões a receber'] loop
     insert into public.gestao_contas(unidade_id,nome,tipo) values(p_unidade,descricao,case descricao when 'Caixa' then 'caixa' when 'Banco / Pix' then 'banco' else 'cartoes' end) returning id into c;
     v:=case descricao when 'Caixa' then coalesce((p_dados->>'caixa')::numeric,0) when 'Banco / Pix' then coalesce((p_dados->>'banco')::numeric,0) else 0 end;
     if v::text in ('NaN','Infinity','-Infinity') or v<0 or v>=1000000000 or v<>round(v,2) then raise exception 'Saldo inicial inválido.';end if;
     if v>0 then insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,criado_por) values(grupo,p_unidade,c,dia,v,'inicial','Saldo inicial',p_ator);end if;
   end loop;
 elsif inicio is null then raise exception 'Ative o financeiro antes de registrar lançamentos.';
 elsif p_acao='conta' then
   if p_dados->>'tipo' is null or p_dados->>'tipo' not in ('caixa','banco','cartoes') or length(descricao) not between 2 and 100 then raise exception 'Informe nome e tipo da conta.';end if;
   insert into public.gestao_contas(unidade_id,nome,tipo) values(p_unidade,descricao,p_dados->>'tipo') returning id into rid;
 elsif p_acao='pagar_cadastrar' then
   if length(descricao) not between 2 and 200 or length(coalesce(p_dados->>'fornecedor',''))>120 or length(coalesce(p_dados->>'observacoes',''))>2000 then raise exception 'Confira a descrição e os dados da conta a pagar.';end if;
   v:=(p_dados->>'valor')::numeric;
   if v is null or v::text in ('NaN','Infinity','-Infinity') or v<=0 or v>=1000000000 or v<>round(v,2) then raise exception 'Informe um valor positivo com até duas casas decimais.';end if;
   insert into public.gestao_contas_pagar(unidade_id,descricao,categoria,fornecedor,observacoes,vencimento,valor,criado_por)
   values(p_unidade,descricao,left(coalesce(p_dados->>'categoria','Outras despesas'),100),coalesce(p_dados->>'fornecedor',''),coalesce(p_dados->>'observacoes',''),(p_dados->>'vencimento')::date,v,p_ator) returning id into rid;
 elsif p_acao='cancelar' then
   select * into p from public.gestao_contas_pagar where id=(p_dados->>'id')::uuid and unidade_id=p_unidade for update;
   if not found or p.fechamento_id is not null then raise exception 'Conta indisponível. Despesas do fechamento devem ser corrigidas no fechamento.';end if;
   if exists(select 1 from public.gestao_fin_movimentos where pagar_id=p.id and not estornado) then raise exception 'Estorne os pagamentos antes de cancelar a conta.';end if;
   if length(descricao)<5 then raise exception 'Informe o motivo do cancelamento.';end if;
   update public.gestao_contas_pagar set cancelada=true where id=p.id;rid:=p.id;
 elsif p_acao='estornar' then
   if length(descricao)<5 then raise exception 'Justifique o estorno com pelo menos 5 caracteres.';end if;
   rid:=(p_dados->>'id')::uuid;
   if not exists(select 1 from public.gestao_fin_movimentos where grupo=rid and unidade_id=p_unidade and not estornado) then raise exception 'Movimento já estornado ou não encontrado.';end if;
   if exists(select 1 from public.gestao_fin_movimentos where grupo=rid and unidade_id=p_unidade and (fechamento_id is not null or tipo='inicial')) then raise exception 'Corrija este lançamento na origem. Saldos iniciais podem ser corrigidos com um ajuste.';end if;
   update public.gestao_fin_movimentos set estornado=true,motivo_estorno=descricao where grupo=rid and unidade_id=p_unidade;
 else
   if dia<inicio or dia>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Informe uma data entre o início do financeiro e hoje.';end if;
   v:=(p_dados->>'valor')::numeric;
   if v is null or v::text in ('NaN','Infinity','-Infinity') or v<=0 or v>=1000000000 or v<>round(v,2) then raise exception 'Informe um valor positivo com até duas casas decimais.';end if;
   c:=gestao_private.fin_conta(p_unidade,(p_dados->>'conta_id')::uuid);
   if p_acao='pagar' then
     select * into p from public.gestao_contas_pagar where id=(p_dados->>'id')::uuid and unidade_id=p_unidade and not cancelada for update;
     if not found then raise exception 'Conta a pagar indisponível.';end if;
     select p.valor+coalesce(sum(valor),0) into restante from public.gestao_fin_movimentos where pagar_id=p.id and not estornado;
     if v>restante then raise exception 'O pagamento supera o saldo pendente. Atualize a página.';end if;
     insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,pagar_id,criado_por) values(grupo,p_unidade,c,dia,-v,'despesa',p.descricao,p.id,p_ator);rid:=p.id;
   elsif p_acao='receber' then
     select * into r from public.gestao_contas_receber where id=(p_dados->>'id')::uuid and unidade_id=p_unidade and not cancelada for update;
     if not found then raise exception 'Recebimento indisponível.';end if;
     if dia<r.data then raise exception 'O recebimento não pode ocorrer antes da venda.';end if;
     select r.valor-coalesce(sum(valor),0) into restante from public.gestao_fin_movimentos where receber_id=r.id and tipo='recebimento' and valor>0 and not estornado;
     if v>restante then raise exception 'O recebimento supera o valor pendente. Atualize a página.';end if;
     insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,receber_id,criado_por) values
     (grupo,p_unidade,r.conta_id,dia,-v,'recebimento',r.descricao,r.id,p_ator),(grupo,p_unidade,c,dia,v,'recebimento',r.descricao,r.id,p_ator);rid:=r.id;
   elsif p_acao='transferir' then
     destino:=gestao_private.fin_conta(p_unidade,(p_dados->>'destino_id')::uuid);
     if destino=c then raise exception 'Escolha contas diferentes.';end if;
     insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,criado_por) values
     (grupo,p_unidade,c,dia,-v,'transferencia','Transferência entre contas',p_ator),(grupo,p_unidade,destino,dia,v,'transferencia','Transferência entre contas',p_ator);
   elsif p_acao in ('aporte','retirada','ajuste_entrada','ajuste_saida') then
     if length(descricao) not between 5 and 200 then raise exception 'Descreva o motivo (5 a 200 caracteres).';end if;
     insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,criado_por) values(grupo,p_unidade,c,dia,v*case when p_acao in ('retirada','ajuste_saida') then -1 else 1 end,p_acao,descricao,p_ator);
   else raise exception 'Operação financeira inválida.';end if;
 end if;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados) values(e,p_ator,'financeiro_'||p_acao,grupo,p_dados||jsonb_build_object('resultado',rid));
 return coalesce(rid,grupo);
end $$;
revoke all on function public.gestao_fin_operar(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_fin_operar(uuid,uuid,text,jsonb) to service_role;

-- Keep the existing team/stock implementation intact behind a single public entry point.
alter function public.gestao_operar(uuid,text,jsonb) rename to operar_equipe;
alter function public.operar_equipe(uuid,text,jsonb) set schema gestao_private;
create function public.gestao_operar(p_ator uuid,p_acao text,p_dados jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare u uuid; e uuid; rid uuid; inicio date; f public.gestao_fechamentos%rowtype; item jsonb; meta jsonb;
 c uuid; pagar uuid; receber uuid; grupo uuid; v numeric; idx integer; restante numeric; tipo text;
begin
 if p_acao not in ('salvar','confirmar','reabrir') then return gestao_private.operar_equipe(p_ator,p_acao,p_dados);end if;
 u:=(p_dados->>'unidade_id')::uuid;rid:=(p_dados->>'id')::uuid;
 select empresa_id into e from public.gestao_unidades where id=u;
 if e is null or gestao_private.papel_gestao(p_ator,e) is null then raise exception 'Empresa ou módulo sem acesso vigente.';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text||':financeiro',0));
 perform pg_advisory_xact_lock(hashtextextended(rid::text,0));
 select * into f from public.gestao_fechamentos where id=rid and unidade_id=u for update;
 select fc.inicio into inicio from public.gestao_fin_config fc where unidade_id=u;
 if p_acao='salvar' then
   rid:=gestao_private.operar_equipe(p_ator,p_acao,p_dados);
   if p_dados ? 'financeiro' then
     if not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then raise exception 'Somente o Master pode definir contas financeiras.';end if;
     if jsonb_typeof(p_dados->'financeiro') is distinct from 'object' then raise exception 'Dados financeiros inválidos.';end if;
     update public.gestao_fechamentos set financeiro=p_dados->'financeiro' where id=rid;
   end if;
   return rid;
 end if;
 if (p_acao='confirmar' and f.status='conferido') or (p_acao='reabrir' and f.status='rascunho') then return gestao_private.operar_equipe(p_ator,p_acao,p_dados);end if;
 if p_acao='reabrir' and f.financeiro_gerado then
   if exists(select 1 from public.gestao_fin_movimentos m join public.gestao_contas_receber r on r.id=m.receber_id where r.fechamento_id=rid and m.tipo='recebimento' and not m.estornado) then raise exception 'Estorne primeiro os recebimentos de cartões vinculados a este fechamento.';end if;
   if exists(select 1 from public.gestao_fin_movimentos m join public.gestao_contas_pagar p on p.id=m.pagar_id where p.fechamento_id=rid and m.fechamento_id is distinct from rid and not m.estornado) then raise exception 'Estorne primeiro os pagamentos posteriores vinculados a este fechamento.';end if;
   update public.gestao_fin_movimentos set estornado=true,motivo_estorno=trim(p_dados->>'motivo') where fechamento_id=rid and not estornado;
   update public.gestao_contas_receber set cancelada=true where fechamento_id=rid;
   update public.gestao_contas_pagar set cancelada=true where fechamento_id=rid;
 end if;
 rid:=gestao_private.operar_equipe(p_ator,p_acao,p_dados);
 if p_acao='reabrir' then update public.gestao_fechamentos set financeiro_gerado=false where id=rid;return rid;end if;
 if inicio is null or f.data<inicio or f.financeiro_legado then return rid;end if;
 if f.data>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Confirme apenas fechamentos com data até hoje.';end if;
 idx:=0;
 for item in select value from jsonb_array_elements(f.pagamentos) loop
   meta:=f.financeiro->'recebimentos'->idx; idx:=idx+1;
   if nullif(meta->>'conta_id','') is null then
     select id into c from public.gestao_contas where unidade_id=u and ativo and tipo=case when item->>'forma' in ('D�bito','Cr�dito') then 'cartoes' when item->>'forma'='Dinheiro' then 'caixa' else 'banco' end order by created_at,id limit 1;
     meta:=jsonb_build_object('conta_id',c,'previsao',f.data+case when item->>'forma'='Cr�dito' then 30 else 1 end);
   end if;
   c:=gestao_private.fin_conta(u,(meta->>'conta_id')::uuid,true);
   select contas.tipo into tipo from public.gestao_contas contas where id=c;
   v:=(item->>'valor_liquido')::numeric;
   if v is null then v:=(item->>'valor')::numeric;end if;
   if item->>'forma' in ('Débito','Crédito') and tipo<>'cartoes' then raise exception 'Vincule débito e crédito a uma conta de cartões a receber.';end if;
   if item->>'forma' not in ('Débito','Crédito') and tipo='cartoes' then raise exception 'Use caixa ou banco para recebimentos imediatos.';end if;
   if v=0 then continue;end if;
   receber:=null;
   if tipo='cartoes' then
     if nullif(meta->>'previsao','') is null or (meta->>'previsao')::date<f.data then raise exception 'Informe a previsão do cartão a partir da data da venda.';end if;
     insert into public.gestao_contas_receber(unidade_id,conta_id,descricao,data,previsao,valor,fechamento_id)
     values(u,c,(item->>'forma')||' · '||f.data,f.data,(meta->>'previsao')::date,v,rid) returning id into receber;
   end if;
   insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,fechamento_id,receber_id,criado_por)
   values(gen_random_uuid(),u,c,f.data,v,case when tipo='cartoes' then 'cartao' else 'venda' end,(item->>'forma')||' · fechamento',rid,receber,p_ator);
 end loop;
 idx:=0;
 for item in select value from jsonb_array_elements(f.despesas) loop
   meta:=f.financeiro->'despesas'->idx;idx:=idx+1;
   c:=nullif(meta->>'conta_id','')::uuid;
   if c is null then select id into c from public.gestao_contas where unidade_id=u and ativo and tipo='caixa' order by created_at,id limit 1;end if;
   c:=gestao_private.fin_conta(u,c);v:=(item->>'valor')::numeric;
   pagar:=nullif(meta->>'pagar_id','')::uuid;
   if pagar is null then
     insert into public.gestao_contas_pagar(unidade_id,descricao,categoria,vencimento,valor,fechamento_id,criado_por)
     values(u,item->>'descricao','Fechamento',f.data,v,rid,p_ator) returning id into pagar;
   else
     select p.valor-coalesce((select -sum(m.valor) from public.gestao_fin_movimentos m where m.pagar_id=p.id and not estornado),0) into restante
     from public.gestao_contas_pagar p where p.id=pagar and p.unidade_id=u and not p.cancelada for update;
     if not found or v>restante then raise exception 'Uma conta vinculada à despesa está indisponível ou seu saldo é menor que o pagamento.';end if;
   end if;
   insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,fechamento_id,pagar_id,criado_por)
   values(gen_random_uuid(),u,c,f.data,-v,'despesa',item->>'descricao',rid,pagar,p_ator);
 end loop;
 for item in select to_jsonb(eq) from public.gestao_fechamento_equipe eq where fechamento_id=rid and valor_pago>0 loop
   c:=nullif(f.financeiro->>'equipe_conta_id','')::uuid;
   if c is null then select id into c from public.gestao_contas where unidade_id=u and ativo and tipo='caixa' order by created_at,id limit 1;end if;
   c:=gestao_private.fin_conta(u,c);
   insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,fechamento_id,criado_por)
   values(gen_random_uuid(),u,c,f.data,-(item->>'valor_pago')::numeric,'equipe','Equipe · '||(item->>'nome'),rid,p_ator);
 end loop;
 update public.gestao_fechamentos set financeiro_gerado=true where id=rid;
 return rid;
end $$;
revoke all on function public.gestao_operar(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_operar(uuid,text,jsonb) to service_role;

create or replace function public.gestao_excluir_fechamento(p_ator uuid,p_unidade uuid,p_fechamento uuid,p_versao integer)
returns void language plpgsql security invoker set search_path='' as $$
declare e uuid; f public.gestao_fechamentos%rowtype;
begin
 if not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then
   raise exception 'Somente o usuário Master pode excluir fechamentos.';
 end if;
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then
   raise exception 'Empresa ou módulo sem acesso vigente.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_unidade::text||':financeiro',0));
 perform pg_advisory_xact_lock(hashtextextended(p_fechamento::text,0));
 select * into f from public.gestao_fechamentos where id=p_fechamento and unidade_id=p_unidade for update;
 if not found then raise exception 'Fechamento não encontrado nesta unidade.'; end if;
 if f.versao is distinct from p_versao then raise exception 'O fechamento foi alterado. Atualize antes de excluir.'; end if;
 -- Reuse transactional reversal, including ordered employee/product locks and dependency checks.
 if f.status='conferido' then
   perform public.gestao_operar(p_ator,'reabrir',jsonb_build_object('id',p_fechamento,'unidade_id',p_unidade,'versao',p_versao,'motivo','Exclusão definitiva pelo Master'));
 end if;
 -- Refuse inconsistent historic data instead of silently corrupting balances.
 if exists(select 1 from public.gestao_equipe_extrato where fechamento_id=p_fechamento and not estornado)
 or exists(select 1 from public.gestao_movimentos where fechamento_id=p_fechamento group by produto_id having sum(quantidade)<>0) then
   raise exception 'Os vínculos deste fechamento precisam ser revisados antes da exclusão.';
 end if;
 -- This existing tombstone also prevents stale clients from recreating the deleted UUID.
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(e,p_ator,'excluir_rascunho',p_fechamento,jsonb_build_object('anterior',to_jsonb(f),'exclusao_definitiva',true));
 delete from public.gestao_equipe_extrato where fechamento_id=p_fechamento;
 delete from public.gestao_movimentos where fechamento_id=p_fechamento;
 delete from public.gestao_fechamentos where id=p_fechamento;
end $$;
revoke all on function public.gestao_excluir_fechamento(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.gestao_excluir_fechamento(uuid,uuid,uuid,integer) to service_role;

