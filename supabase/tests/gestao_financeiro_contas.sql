begin;
do $$
declare a uuid:=gen_random_uuid();adm uuid:=gen_random_uuid();e uuid:=gen_random_uuid();u uuid;m uuid;c uuid;b uuid;card uuid;prod uuid;cat uuid;f uuid:=gen_random_uuid();p uuid;r uuid;colab uuid:=gen_random_uuid();g uuid:=gen_random_uuid();x jsonb;v numeric;n integer;
begin
 insert into auth.users(id,email) values(a,a||'@finance.test'),(adm,adm||'@finance.test');
 insert into public.empresas(id,nome,status) values(e,'Teste financeiro transacional','active');
 insert into public.perfis(id,nome,role,ativo,prefeitura_id) values(a,'Master teste','bdl_admin',true,null),(adm,'Admin teste','municipal_admin',true,e);
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-10,current_date+10,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 begin perform public.gestao_fin_operar(adm,u,'ativar',jsonb_build_object('data',current_date));raise exception 'FAIL admin finance';exception when raise_exception then if sqlerrm not like '%exclusivo%' then raise;end if;end;
 perform public.gestao_fin_operar(a,u,'ativar',jsonb_build_object('data',current_date-1,'caixa',300,'banco',2000));
 select id into c from public.gestao_contas where unidade_id=u and tipo='caixa';select id into b from public.gestao_contas where unidade_id=u and tipo='banco';select id into card from public.gestao_contas where unidade_id=u and tipo='cobranca';
 perform public.gestao_fin_operar(a,u,'transferir',jsonb_build_object('requisicao',g,'conta_id',c,'destino_id',b,'valor',100));
 perform public.gestao_fin_operar(a,u,'transferir',jsonb_build_object('requisicao',g,'conta_id',c,'destino_id',b,'valor',100));
 if (select saldo from public.gestao_contas_saldos where id=c)<>200 or (select saldo from public.gestao_contas_saldos where id=b)<>2100 then raise exception 'FAIL transfer idempotency';end if;
 perform public.gestao_fin_operar(a,u,'estornar',jsonb_build_object('id',g,'descricao','Teste estorno transferencia'));
 if (select saldo from public.gestao_contas_saldos where id=c)<>300 then raise exception 'FAIL reverse transfer';end if;
 p:=public.gestao_fin_operar(a,u,'pagar_cadastrar',jsonb_build_object('descricao','Fornecedor teste','vencimento',current_date,'valor',1200));
 if (select saldo from public.gestao_contas_saldos where id=b)<>2000 then raise exception 'FAIL payable changes cash';end if;
 perform public.gestao_fin_operar(a,u,'pagar',jsonb_build_object('id',p,'conta_id',b,'valor',500));
 if (select pago from public.gestao_pagar_saldos where id=p)<>500 then raise exception 'FAIL partial pay';end if;
 begin perform public.gestao_fin_operar(a,u,'pagar',jsonb_build_object('id',p,'conta_id',b,'valor',701));raise exception 'FAIL overpayment';exception when raise_exception then if sqlerrm not like '%supera%' then raise;end if;end;
 begin perform public.gestao_fin_operar(a,u,'cancelar',jsonb_build_object('id',p,'descricao','Cancelar indevidamente'));raise exception 'FAIL cancel paid';exception when raise_exception then if sqlerrm not like '%Estorne%' then raise;end if;end;
 select id into cat from public.gestao_categorias where empresa_id=e limit 1;
 prod:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Produto financeiro','categoria_id',cat,'unidade','un','preco',100,'minimo',0));
 x:=jsonb_build_object('id',f,'unidade_id',u,'versao',0,'data',current_date,'turno','dia','origem','teste','itens',jsonb_build_array(jsonb_build_object('produto_id',prod,'quantidade',10,'preco_unitario',100,'total',1000)),'pagamentos',jsonb_build_array(jsonb_build_object('forma','Crédito','origem','Maquininha','valor',1000,'taxa_percentual',3)), 'despesas',jsonb_build_array(jsonb_build_object('descricao','Fornecedor teste','valor',700)), 'financeiro',jsonb_build_object('recebimentos',jsonb_build_array(jsonb_build_object('conta_id',card,'previsao',current_date+30)),'despesas',jsonb_build_array(jsonb_build_object('conta_id',b,'pagar_id',p))));
 perform public.gestao_operar(a,'salvar',x);
 if (select saldo from public.gestao_contas_saldos where id=card)<>0 then raise exception 'FAIL draft cash';end if;
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 if (select saldo from public.gestao_contas_saldos where id=card)<>970 or (select pago from public.gestao_pagar_saldos where id=p)<>1200 or (select count(*) from public.gestao_contas_pagar where unidade_id=u)<>1 then raise exception 'FAIL closing integration/duplicate expense';end if;
 g:=gen_random_uuid();perform public.gestao_fin_operar(a,u,'transferir',jsonb_build_object('requisicao',g,'conta_id',card,'destino_id',b,'valor',970));
 if (select saldo from public.gestao_contas_saldos where id=card)<>0 then raise exception 'FAIL provider transfer';end if;
 begin perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'unidade_id',u,'versao',2,'motivo','Teste bloqueio'));raise exception 'FAIL reopen after transfer';exception when raise_exception then if sqlerrm not like '%Saldo insuficiente%' then raise;end if;end;
 perform public.gestao_fin_operar(a,u,'estornar',jsonb_build_object('id',g,'descricao','Estornar transferência teste'));
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'unidade_id',u,'versao',2,'motivo','Teste reabertura'));
 if (select saldo from public.gestao_contas_saldos where id=card)<>0 or (select pago from public.gestao_pagar_saldos where id=p)<>500 then raise exception 'FAIL reopen reversal';end if;
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',3));
 perform public.gestao_excluir_fechamento(a,u,f,4);
 if (select saldo from public.gestao_contas_saldos where id=card)<>0 or exists(select 1 from public.gestao_fin_movimentos where fechamento_id=f and not estornado) then raise exception 'FAIL delete reversal';end if;
 -- Non-Master closings keep working through default accounts, without financial permissions.
 f:=gen_random_uuid();
 x:=(x-'financeiro')||jsonb_build_object('id',f,'turno','noite','despesas','[]'::jsonb);
 perform public.gestao_operar(adm,'salvar',x);
 perform public.gestao_operar(adm,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 if (select saldo from public.gestao_contas_saldos where id=card)<>970 then raise exception 'FAIL admin automatic accounts';end if;
 begin perform public.gestao_operar(adm,'salvar',x||jsonb_build_object('id',gen_random_uuid(),'turno','madrugada','financeiro','{}'::jsonb));raise exception 'FAIL admin finance metadata';exception when raise_exception then if sqlerrm not like '%Master%' then raise;end if;end;
 -- Work accrual is not a second payable; only actual payroll reduces cash.
 perform public.gestao_equipe_operar(a,'colaborador',jsonb_build_object('id',colab,'unidade_id',u,'nome','Equipe teste','funcao','Atendente','valor',100));
 f:=gen_random_uuid();x:=jsonb_build_object('id',f,'unidade_id',u,'versao',0,'data',current_date,'turno','equipe','origem','teste','itens','[]'::jsonb,'pagamentos','[]'::jsonb,'equipe',jsonb_build_array(jsonb_build_object('colaborador_id',colab,'presente',true,'valor_trabalho',100,'valor_pago',40)));
 perform public.gestao_operar(adm,'salvar',x);perform public.gestao_operar(adm,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 if (select saldo from public.gestao_contas_saldos where id=c)<>260 then raise exception 'FAIL payroll cash';end if;
 if (select count(*) from public.gestao_contas_pagar where unidade_id=u)<>1 then raise exception 'FAIL payroll duplicated payable';end if;
 if (select sum(case when tipo='trabalho' then valor else -valor end) from public.gestao_equipe_extrato where colaborador_id=colab and not estornado)<>60 then raise exception 'FAIL accrued payroll';end if;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'unidade_id',u,'versao',2,'motivo','Reverter equipe teste'));
 if (select saldo from public.gestao_contas_saldos where id=c)<>300 then raise exception 'FAIL payroll reverse';end if;
 -- Actual RLS and direct-write restrictions, including administrator denial.
 perform set_config('request.jwt.claim.sub',adm::text,true);
 set local role authenticated;
 if exists(select 1 from public.gestao_contas where unidade_id=u) then raise exception 'FAIL admin RLS';end if;
 if exists(select 1 from public.gestao_contas_saldos where unidade_id=u) then raise exception 'FAIL admin view RLS';end if;
 begin perform public.gestao_fin_operar(a,u,'conta','{}');raise exception 'FAIL exposed RPC';exception when insufficient_privilege then null;end;
 reset role;
 perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 if (select count(*) from public.gestao_contas where unidade_id=u)<>3 then raise exception 'FAIL master RLS';end if;
 begin insert into public.gestao_contas(unidade_id,nome,tipo)values(u,'Bypass','caixa');raise exception 'FAIL direct write';exception when insufficient_privilege then null;end;
 reset role;
end $$;
select 'PASS: master-only RPC/RLS, initial balances, partial payment, overpayment, transfer idempotency and reversal, draft isolation, closing fees, linked payable without duplicate, provider transfer, balance dependency guard, reopen/reconfirm/delete reversal' result;
rollback;


