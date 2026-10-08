create or replace function public.gestao_fin_operar(p_ator uuid,p_unidade uuid,p_acao text,p_dados jsonb) returns uuid
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
revoke all on function public.gestao_fin_operar(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gestao_fin_operar(uuid,uuid,text,jsonb) to service_role;

