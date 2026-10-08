begin;
do $$
declare a uuid:=gen_random_uuid();adm uuid:=gen_random_uuid();e uuid:=gen_random_uuid();u uuid;m uuid;c uuid;b uuid;s uuid;p uuid;r uuid;g uuid;prod uuid;cat uuid;f uuid:=gen_random_uuid();x jsonb;today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 insert into auth.users(id,email) values(a,a||'@billing.test'),(adm,adm||'@billing.test');
 insert into public.empresas(id,nome,status) values(e,'Teste cobrança transacional','active');
 insert into public.perfis(id,nome,role,ativo,prefeitura_id) values(a,'Master teste','bdl_admin',true,null),(adm,'Admin teste','municipal_admin',true,e);
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',today-10,today+10,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 perform public.gestao_fin_operar(a,u,'ativar',jsonb_build_object('data',today-2,'caixa',100,'banco',200,'sistema',300));
 select id into c from public.gestao_contas where unidade_id=u and tipo='caixa';select id into b from public.gestao_contas where unidade_id=u and tipo='banco';select id into s from public.gestao_contas where unidade_id=u and tipo='cobranca';
 if (select saldo from public.gestao_contas_saldos where id=s)<>300 then raise exception 'FAIL opening provider';end if;
 p:=public.gestao_fin_operar(a,u,'pagar_cadastrar',jsonb_build_object('descricao','Fornecedor teste','vencimento',today,'valor',200));
 r:=public.gestao_fin_operar(a,u,'solicitar_pagamento',jsonb_build_object('id',p,'conta_id',s,'valor',150));
 if (select saldo from public.gestao_contas_saldos where id=s)<>300 or (select pago from public.gestao_pagar_saldos where id=p)<>0 then raise exception 'FAIL request changes balance or pays bill';end if;
 begin perform public.gestao_fin_operar(a,u,'solicitar_repasse',jsonb_build_object('conta_id',s,'destino_id',b,'valor',151));raise exception 'FAIL reserve overdraw';exception when raise_exception then if sqlerrm not like '%reservado%' then raise;end if;end;
 begin perform public.gestao_fin_operar(a,u,'solicitar_pagamento',jsonb_build_object('id',p,'conta_id',s,'valor',51));raise exception 'FAIL payable over-reserve';exception when raise_exception then if sqlerrm not like '%pagamento solicitado%' then raise;end if;end;
 begin perform public.gestao_fin_operar(a,u,'pagar',jsonb_build_object('id',p,'conta_id',b,'valor',51));raise exception 'FAIL pay reserved debt';exception when raise_exception then if sqlerrm not like '%pagamento solicitado%' then raise;end if;end;
 begin perform public.gestao_fin_operar(a,u,'cancelar',jsonb_build_object('id',p,'descricao','Teste cancelar'));raise exception 'FAIL cancel reserved debt';exception when raise_exception then if sqlerrm not like '%pagamento solicitado%' then raise;end if;end;
 perform public.gestao_fin_operar(a,u,'concluir_solicitacao',jsonb_build_object('id',r,'data',today,'valor',1,'conta_id',b));
 perform public.gestao_fin_operar(a,u,'concluir_solicitacao',jsonb_build_object('id',r,'data',today));
 if (select saldo from public.gestao_contas_saldos where id=s)<>150 or (select saldo from public.gestao_contas_saldos where id=b)<>200 or (select pago from public.gestao_pagar_saldos where id=p)<>150 then raise exception 'FAIL provider direct payment/idempotency/tamper';end if;
 perform public.gestao_fin_operar(a,u,'estornar',jsonb_build_object('id',r,'descricao','Teste estorno pedido'));
 if (select status from public.gestao_fin_solicitacoes where id=r)<>'estornada' or (select saldo from public.gestao_contas_saldos where id=s)<>300 then raise exception 'FAIL request reversal';end if;
 r:=public.gestao_fin_operar(a,u,'solicitar_repasse',jsonb_build_object('conta_id',s,'destino_id',b,'valor',200));
 perform public.gestao_fin_operar(a,u,'cancelar_solicitacao',jsonb_build_object('id',r,'descricao','Teste cancelar pedido'));
 if (select status from public.gestao_fin_solicitacoes where id=r)<>'cancelada' then raise exception 'FAIL cancellation';end if;
 r:=public.gestao_fin_operar(a,u,'solicitar_repasse',jsonb_build_object('conta_id',s,'destino_id',b,'valor',300));
 perform public.gestao_fin_operar(a,u,'concluir_solicitacao',jsonb_build_object('id',r,'data',today));
 if (select saldo from public.gestao_contas_saldos where id=s)<>0 or (select saldo from public.gestao_contas_saldos where id=b)<>500 then raise exception 'FAIL repasse pair';end if;
 begin perform public.gestao_fin_operar(a,u,'pagar',jsonb_build_object('id',p,'conta_id',s,'valor',1));raise exception 'FAIL overdraft';exception when raise_exception then if sqlerrm not like '%Saldo insuficiente%' then raise;end if;end;
 perform public.gestao_fin_operar(a,u,'estornar',jsonb_build_object('id',r,'descricao','Teste estorno repasse'));
 -- Non-cash closings go to provider; old Pix bank metadata is normalized.
 select id into cat from public.gestao_categorias where empresa_id=e limit 1;
 prod:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Produto cobrança','categoria_id',cat,'unidade','un','preco',100,'minimo',0));
 x:=jsonb_build_object('id',f,'unidade_id',u,'versao',0,'data',today-1,'turno','dia','origem','teste','itens',jsonb_build_array(jsonb_build_object('produto_id',prod,'quantidade',3,'preco_unitario',100,'total',300)),
 'pagamentos',jsonb_build_array(jsonb_build_object('forma','Dinheiro','origem','teste','valor',100),jsonb_build_object('forma','Pix','origem','teste','valor',100,'taxa_percentual',2),jsonb_build_object('forma','Crédito','origem','teste','valor',100,'taxa_percentual',3)),
 'financeiro',jsonb_build_object('recebimentos',jsonb_build_array(jsonb_build_object('conta_id',c),jsonb_build_object('conta_id',b),jsonb_build_object('conta_id',s))));
 perform public.gestao_operar(a,'salvar',x);perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 if (select saldo from public.gestao_contas_saldos where id=s)<>495 or (select saldo from public.gestao_contas_saldos where id=b)<>200 or (select saldo from public.gestao_contas_saldos where id=c)<>200 then raise exception 'FAIL cash/pix/card routing and fees';end if;
 g:=gen_random_uuid();perform public.gestao_fin_operar(a,u,'transferir',jsonb_build_object('requisicao',g,'conta_id',s,'destino_id',b,'valor',400));
 begin perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'unidade_id',u,'versao',2,'motivo','Teste saldo usado'));raise exception 'FAIL reopen spent provider';exception when raise_exception then if sqlerrm not like '%Saldo insuficiente%' then raise;end if;end;
 if (select status from public.gestao_fechamentos where id=f)<>'conferido' then raise exception 'FAIL atomic reopen';end if;
 perform public.gestao_fin_operar(a,u,'estornar',jsonb_build_object('id',g,'descricao','Teste estorno saldo'));
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'unidade_id',u,'versao',2,'motivo','Teste reabertura'));
 if (select saldo from public.gestao_contas_saldos where id=s)<>300 then raise exception 'FAIL reopen balance';end if;
 -- Check later positive balance does not cover earlier overspend.
 perform public.gestao_fin_operar(a,u,'aporte',jsonb_build_object('conta_id',s,'valor',200,'descricao','Teste aporte futuro'));
 begin perform public.gestao_fin_operar(a,u,'transferir',jsonb_build_object('conta_id',s,'destino_id',b,'valor',400,'data',today-1));raise exception 'FAIL historical overdraft';exception when raise_exception then if sqlerrm not like '%Saldo insuficiente%' then raise;end if;end;
 begin perform public.gestao_fin_operar(adm,u,'solicitar_repasse',jsonb_build_object('conta_id',s,'destino_id',b,'valor',1));raise exception 'FAIL admin';exception when raise_exception then if sqlerrm not like '%exclusivo%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',adm::text,true);set local role authenticated;
 if exists(select 1 from public.gestao_fin_solicitacoes where unidade_id=u) then raise exception 'FAIL request RLS';end if;
 begin perform public.gestao_fin_operar(a,u,'concluir_solicitacao','{}');raise exception 'FAIL exposed RPC';exception when insufficient_privilege then null;end;
 reset role;
 perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 if (select count(*) from public.gestao_fin_solicitacoes where unidade_id=u)<>3 then raise exception 'FAIL Master RLS';end if;
 reset role;
end $$;
select 'PASS: provider opening, cash/Pix/cards, reservations, direct provider payment, request conclusion/cancellation/reversal, idempotency, historical balance, atomic reopen, Master permissions' result;
rollback;
