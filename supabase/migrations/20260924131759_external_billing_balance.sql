-- A billing provider is a real balance, independent of the company's bank.
alter table public.gestao_contas drop constraint gestao_contas_tipo_check;
update public.gestao_contas set tipo='cobranca',nome=case when nome='Cartões a receber' then 'Sistema de cobrança' else nome end where tipo='cartoes';
update public.gestao_contas set nome='Banco' where nome='Banco / Pix';
alter table public.gestao_contas add constraint gestao_contas_tipo_check check(tipo in ('caixa','banco','cobranca'));

create table public.gestao_fin_solicitacoes (
 id uuid primary key default gen_random_uuid(), unidade_id uuid not null references public.gestao_unidades(id),
 tipo text not null check(tipo in ('repasse','pagamento')), conta_id uuid not null, destino_id uuid, pagar_id uuid,
 valor numeric(14,2) not null check(valor>0 and valor<1000000000),
 status text not null default 'pendente' check(status in ('pendente','concluida','cancelada','estornada')),
 data date not null, concluida_em date, observacoes text not null default '' check(length(observacoes)<=1000),
 motivo_cancelamento text, criado_por uuid not null references public.perfis(id), created_at timestamptz not null default now(),
 foreign key(conta_id,unidade_id) references public.gestao_contas(id,unidade_id),
 foreign key(destino_id,unidade_id) references public.gestao_contas(id,unidade_id),
 foreign key(pagar_id,unidade_id) references public.gestao_contas_pagar(id,unidade_id),
 check((tipo='repasse' and destino_id is not null and pagar_id is null and destino_id<>conta_id) or (tipo='pagamento' and pagar_id is not null and destino_id is null))
);
create index on public.gestao_fin_solicitacoes(unidade_id,status,data);
create index on public.gestao_fin_solicitacoes(conta_id);
create index on public.gestao_fin_solicitacoes(destino_id);
create index on public.gestao_fin_solicitacoes(pagar_id);
create index on public.gestao_fin_solicitacoes(criado_por);
alter table public.gestao_fin_solicitacoes enable row level security;
revoke all on public.gestao_fin_solicitacoes from public,anon,authenticated;
grant select on public.gestao_fin_solicitacoes to authenticated;
grant all on public.gestao_fin_solicitacoes to service_role;
create policy solicitacoes_master on public.gestao_fin_solicitacoes for select to authenticated
using((select gestao_private.fin_master()) and unidade_id in(select u.id from public.gestao_unidades u where u.empresa_id in(select gestao_private.empresas_equipe())));

create or replace function gestao_private.fin_conta(u uuid,c uuid,cartao boolean default false) returns uuid
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.gestao_contas where id=c and unidade_id=u and ativo) then raise exception 'Selecione uma conta ativa desta unidade.';end if;
 return c;
end $$;
revoke all on function gestao_private.fin_conta(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function gestao_private.fin_conta(uuid,uuid,boolean) to service_role;

-- Called under the same unit lock by every financial mutation and closing reversal.
-- Check the whole daily history: a backdated expense cannot spend later income.
create function gestao_private.validar_saldo_cobranca(u uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if exists(select 1 from (
   select m.conta_id,m.data,sum(sum(m.valor)) over(partition by m.conta_id order by m.data) saldo
   from public.gestao_fin_movimentos m join public.gestao_contas c on c.id=m.conta_id
   where m.unidade_id=u and c.tipo='cobranca' and not m.estornado group by m.conta_id,m.data
 ) historico where saldo<0) then raise exception 'Saldo insuficiente no sistema de cobrança na data informada ou em um movimento posterior. Revise os pagamentos e repasses antes de continuar.';end if;
 if exists(select 1 from public.gestao_contas c where c.unidade_id=u and c.tipo='cobranca' and
   coalesce((select sum(s.valor) from public.gestao_fin_solicitacoes s where s.conta_id=c.id and s.status='pendente'),0)>
   coalesce((select sum(m.valor) from public.gestao_fin_movimentos m where m.conta_id=c.id and not m.estornado),0)) then
   raise exception 'O valor está reservado em solicitações pendentes. Cancele ou conclua os pedidos antes de usar esse saldo.';end if;
 if exists(select 1 from public.gestao_contas_pagar p where p.unidade_id=u and
   coalesce((select sum(s.valor) from public.gestao_fin_solicitacoes s where s.pagar_id=p.id and s.status='pendente'),0)>
   case when p.cancelada then 0 else p.valor+coalesce((select sum(m.valor) from public.gestao_fin_movimentos m where m.pagar_id=p.id and not m.estornado),0) end) then
   raise exception 'Esta conta possui pagamento solicitado. Cancele ou conclua a solicitação antes de pagar ou cancelar a conta.';end if;
end $$;
revoke all on function gestao_private.validar_saldo_cobranca(uuid) from public,anon,authenticated;
grant execute on function gestao_private.validar_saldo_cobranca(uuid) to service_role;

-- GENERATED FUNCTIONS
create or replace function gestao_private.fin_operar_base(p_ator uuid,p_unidade uuid,p_acao text,p_dados jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
<<fin>>
declare e uuid; inicio date; dia date; v numeric; c uuid; destino uuid; rid uuid; grupo uuid; descricao text;
 p public.gestao_contas_pagar%rowtype; r public.gestao_contas_receber%rowtype; restante numeric;
begin
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' or not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then raise exception 'O financeiro é exclusivo do usuário Master com acesso vigente à unidade.';end if;
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
   update public.gestao_fechamentos set financeiro_legado=true where unidade_id=p_unidade and status='conferido';
   insert into public.gestao_fin_config values(p_unidade,dia,p_ator,now());
   foreach descricao in array array['Caixa','Banco','Sistema de cobrança'] loop
     insert into public.gestao_contas(unidade_id,nome,tipo) values(p_unidade,descricao,case descricao when 'Caixa' then 'caixa' when 'Banco' then 'banco' else 'cobranca' end) returning id into c;
     v:=case descricao when 'Caixa' then coalesce((p_dados->>'caixa')::numeric,0) when 'Banco' then coalesce((p_dados->>'banco')::numeric,0) else coalesce((p_dados->>'sistema')::numeric,0) end;
     if v::text in ('NaN','Infinity','-Infinity') or v<0 or v>=1000000000 or v<>round(v,2) then raise exception 'Saldo inicial inválido.';end if;
     if v>0 then insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,criado_por) values(grupo,p_unidade,c,dia,v,'inicial','Saldo inicial',p_ator);end if;
   end loop;
 elsif inicio is null then raise exception 'Ative o financeiro antes de registrar lançamentos.';
 elsif p_acao='conta' then
   if p_dados->>'tipo' is null or p_dados->>'tipo' not in ('caixa','banco','cobranca') or length(descricao) not between 2 and 100 then raise exception 'Informe nome e tipo da conta.';end if;
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
   if not exists(select 1 from public.gestao_fin_movimentos where gestao_fin_movimentos.grupo=rid and unidade_id=p_unidade and not estornado) then raise exception 'Movimento já estornado ou não encontrado.';end if;
   if exists(select 1 from public.gestao_fin_movimentos where gestao_fin_movimentos.grupo=rid and unidade_id=p_unidade and (fechamento_id is not null or tipo='inicial')) then raise exception 'Corrija este lançamento na origem. Saldos iniciais podem ser corrigidos com um ajuste.';end if;
   update public.gestao_fin_movimentos set estornado=true,motivo_estorno=fin.descricao where gestao_fin_movimentos.grupo=rid and unidade_id=p_unidade;
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
revoke all on function gestao_private.fin_operar_base(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function gestao_private.fin_operar_base(uuid,uuid,text,jsonb) to service_role;


create or replace function public.gestao_fin_operar(p_ator uuid,p_unidade uuid,p_acao text,p_dados jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_e uuid;v_rid uuid;v_request uuid;v_conta uuid;v_destino uuid;v_pagar uuid;v_valor numeric;v_inicio date;
 v_dia date;v_s public.gestao_fin_solicitacoes%rowtype;v_hoje date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 select empresa_id into v_e from public.gestao_unidades where id=p_unidade;
 if v_e is null or gestao_private.papel_gestao(p_ator,v_e) is distinct from 'gestor' or not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then raise exception 'O financeiro é exclusivo do usuário Master com acesso vigente à unidade.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_unidade::text||':financeiro',0));
 v_request:=coalesce((p_dados->>'requisicao')::uuid,gen_random_uuid());
 if exists(select 1 from public.gestao_auditoria where registro_id=v_request and empresa_id=v_e and acao='financeiro_'||p_acao) then return v_request;end if;
 if p_acao='receber' then raise exception 'Use as solicitações de repasse ou registre uma transferência do sistema para o banco.';end if;
 select inicio into v_inicio from public.gestao_fin_config where unidade_id=p_unidade;
 if p_acao in ('solicitar_repasse','solicitar_pagamento') then
   if v_inicio is null then raise exception 'Ative o financeiro primeiro.';end if;
   v_conta:=gestao_private.fin_conta(p_unidade,(p_dados->>'conta_id')::uuid);
   if not exists(select 1 from public.gestao_contas where id=v_conta and tipo='cobranca') then raise exception 'Selecione o sistema de cobrança como origem.';end if;
   v_valor:=(p_dados->>'valor')::numeric;
   if v_valor is null or v_valor::text in ('NaN','Infinity','-Infinity') or v_valor<=0 or v_valor>=1000000000 or v_valor<>round(v_valor,2) then raise exception 'Informe um valor positivo com até duas casas decimais.';end if;
   if length(coalesce(p_dados->>'observacoes',''))>1000 then raise exception 'Use até 1.000 caracteres na observação.';end if;
   if p_acao='solicitar_repasse' then
     v_destino:=gestao_private.fin_conta(p_unidade,(p_dados->>'destino_id')::uuid);
     if not exists(select 1 from public.gestao_contas where id=v_destino and tipo='banco') then raise exception 'Escolha uma conta bancária para receber o repasse.';end if;
   else
     v_pagar:=(p_dados->>'id')::uuid;
     if not exists(select 1 from public.gestao_contas_pagar where id=v_pagar and unidade_id=p_unidade and not cancelada) then raise exception 'Conta a pagar indisponível.';end if;
   end if;
   insert into public.gestao_fin_solicitacoes(id,unidade_id,tipo,conta_id,destino_id,pagar_id,valor,data,observacoes,criado_por)
   values(v_request,p_unidade,case when p_acao='solicitar_repasse' then 'repasse' else 'pagamento' end,v_conta,v_destino,v_pagar,v_valor,v_hoje,coalesce(p_dados->>'observacoes',''),p_ator) returning id into v_rid;
 elsif p_acao in ('concluir_solicitacao','cancelar_solicitacao') then
   select * into v_s from public.gestao_fin_solicitacoes where id=(p_dados->>'id')::uuid and unidade_id=p_unidade for update;
   if not found then raise exception 'Solicitação não encontrada nesta unidade.';end if;
   if (p_acao='concluir_solicitacao' and v_s.status='concluida') or (p_acao='cancelar_solicitacao' and v_s.status='cancelada') then return v_s.id;end if;
   if v_s.status<>'pendente' then raise exception 'A solicitação não está pendente. Atualize a página.';end if;
   if p_acao='cancelar_solicitacao' then
     if length(trim(coalesce(p_dados->>'descricao','')))<5 then raise exception 'Informe o motivo do cancelamento.';end if;
     update public.gestao_fin_solicitacoes set status='cancelada',motivo_cancelamento=trim(p_dados->>'descricao') where id=v_s.id;
   else
     v_dia:=nullif(p_dados->>'data','')::date;
     if v_dia is null or v_dia<v_s.data or v_dia>v_hoje then raise exception 'Informe a data de execução entre a solicitação e hoje.';end if;
     update public.gestao_fin_solicitacoes set status='concluida',concluida_em=v_dia where id=v_s.id;
     perform gestao_private.fin_operar_base(p_ator,p_unidade,case when v_s.tipo='repasse' then 'transferir' else 'pagar' end,
       jsonb_build_object('requisicao',v_s.id,'conta_id',v_s.conta_id,'destino_id',v_s.destino_id,'id',v_s.pagar_id,'valor',v_s.valor,'data',v_dia));
   end if;
   v_rid:=v_s.id;
 else
   v_rid:=gestao_private.fin_operar_base(p_ator,p_unidade,p_acao,p_dados||jsonb_build_object('requisicao',v_request));
   if p_acao='estornar' then update public.gestao_fin_solicitacoes set status='estornada' where id=(p_dados->>'id')::uuid and unidade_id=p_unidade and status='concluida';end if;
   perform gestao_private.validar_saldo_cobranca(p_unidade);
   return v_rid;
 end if;
 perform gestao_private.validar_saldo_cobranca(p_unidade);
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(v_e,p_ator,'financeiro_'||p_acao,v_request,p_dados||jsonb_build_object('resultado',v_rid));
 return v_rid;
end $$;
revoke all on function public.gestao_fin_operar(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_fin_operar(uuid,uuid,text,jsonb) to service_role;

create or replace function public.gestao_operar(p_ator uuid,p_acao text,p_dados jsonb) returns uuid
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
   if not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then update public.gestao_fechamentos set financeiro='{}' where id=rid;end if;
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
 if p_acao='reabrir' then update public.gestao_fechamentos set financeiro_gerado=false where id=rid;perform gestao_private.validar_saldo_cobranca(u);return rid;end if;
 if inicio is null or f.data<inicio or f.financeiro_legado then return rid;end if;
 if f.data>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Confirme apenas fechamentos com data até hoje.';end if;
 idx:=0;
 for item in select value from jsonb_array_elements(f.pagamentos) loop
   meta:=f.financeiro->'recebimentos'->idx; idx:=idx+1;
   c:=nullif(meta->>'conta_id','')::uuid;
   if c is not null then perform gestao_private.fin_conta(u,c);end if;
   -- Old drafts may still point Pix at the bank. Normalize their incoming destination.
   if c is null or not exists(select 1 from public.gestao_contas where id=c and unidade_id=u and ativo and gestao_contas.tipo=case when item->>'forma'='Dinheiro' then 'caixa' else 'cobranca' end) then
     select id into c from public.gestao_contas where unidade_id=u and ativo and gestao_contas.tipo=case when item->>'forma'='Dinheiro' then 'caixa' else 'cobranca' end order by created_at,id limit 1;
   end if;
   c:=gestao_private.fin_conta(u,c);
   v:=coalesce((item->>'valor_liquido')::numeric,(item->>'valor')::numeric);
   if v=0 then continue;end if;
   insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,fechamento_id,criado_por)
   values(gen_random_uuid(),u,c,f.data,v,'venda',(item->>'forma')||' · fechamento',rid,p_ator);
 end loop;
 idx:=0;
 for item in select value from jsonb_array_elements(f.despesas) loop
   meta:=f.financeiro->'despesas'->idx;idx:=idx+1;
   c:=nullif(meta->>'conta_id','')::uuid;
   if c is null then select id into c from public.gestao_contas where unidade_id=u and ativo and gestao_contas.tipo='caixa' order by created_at,id limit 1;end if;
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
   if c is null then select id into c from public.gestao_contas where unidade_id=u and ativo and gestao_contas.tipo='caixa' order by created_at,id limit 1;end if;
   c:=gestao_private.fin_conta(u,c);
   insert into public.gestao_fin_movimentos(grupo,unidade_id,conta_id,data,valor,tipo,descricao,fechamento_id,criado_por)
   values(gen_random_uuid(),u,c,f.data,-(item->>'valor_pago')::numeric,'equipe','Equipe · '||(item->>'nome'),rid,p_ator);
 end loop;
 perform gestao_private.validar_saldo_cobranca(u);
 update public.gestao_fechamentos set financeiro_gerado=true where id=rid;
 return rid;
end $$;
revoke all on function public.gestao_operar(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_operar(uuid,text,jsonb) to service_role;



-- Reclassify only incoming Pix/Outros from closings; real bank transfers stay untouched.
do $$ declare m record;target uuid;begin
 for m in select mv.*,u.empresa_id from public.gestao_fin_movimentos mv join public.gestao_contas c on c.id=mv.conta_id join public.gestao_unidades u on u.id=mv.unidade_id
 where mv.fechamento_id is not null and mv.tipo='venda' and mv.valor>0 and c.tipo='banco' and mv.descricao in ('Pix · fechamento','Outros · fechamento') loop
   select id into target from public.gestao_contas where unidade_id=m.unidade_id and tipo='cobranca' and ativo order by created_at,id limit 1;
   if target is null then raise exception 'Conta de cobrança necessária para adaptar o histórico.';end if;
   update public.gestao_fin_movimentos set conta_id=target where id=m.id;
   insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
   values(m.empresa_id,m.criado_por,'financeiro_reclassificar_cobranca',m.id,jsonb_build_object('conta_anterior',m.conta_id,'conta_atual',target,'motivo','Pix e Outros são retidos no sistema externo; adaptação do modelo solicitada.'));
 end loop;
 for m in select unidade_id from public.gestao_fin_config loop
   perform gestao_private.validar_saldo_cobranca(m.unidade_id);
 end loop;
end $$;
