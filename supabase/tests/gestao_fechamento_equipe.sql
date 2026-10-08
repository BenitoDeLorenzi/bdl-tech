begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); e2 uuid:=gen_random_uuid(); u uuid; m uuid; c uuid:=gen_random_uuid(); cat uuid; p uuid;
 f1 uuid:=gen_random_uuid();f2 uuid:=gen_random_uuid();f3 uuid:=gen_random_uuid();f4 uuid:=gen_random_uuid();x jsonb; team jsonb; n integer;
begin
 insert into auth.users(id,email) values(a,a||'@closingteam.test'),(b,b||'@closingteam.test'),(outsider,outsider||'@closingteam.test');
 insert into public.empresas(id,nome,status) values(e,'Equipe fechamento teste','active'),(e2,'Outra empresa equipe','active');
 insert into public.perfis(id,nome,role,ativo,prefeitura_id) values(a,'Gestor teste','municipal_admin',true,e),(b,'Operador teste','municipal_user',true,e),(outsider,'Outro gestor','municipal_admin',true,e2);
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-10,current_date+1,0),(e2,m,'active',current_date-10,current_date+1,0);
 insert into public.usuario_modulos(usuario_id,prefeitura_id,modulo_id) values(b,e,m);
 select id into u from public.gestao_unidades where empresa_id=e;
 select id into cat from public.gestao_categorias where empresa_id=e limit 1;
 p:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Produto teste','categoria_id',cat,'unidade','un','preco',100,'minimo',0));
 perform public.gestao_equipe_operar(a,'colaborador',jsonb_build_object('id',c,'unidade_id',u,'nome','Ana teste','funcao','Atendente','valor',100));
 x:=jsonb_build_object('id',f1,'unidade_id',u,'versao',0,'data',current_date-4,'turno','dia','origem','teste','itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',1,'preco_unitario',100,'total',100)),'pagamentos',jsonb_build_array(jsonb_build_object('forma','Dinheiro','origem','Caixa','valor',100)),'equipe',jsonb_build_array(jsonb_build_object('colaborador_id',c,'presente',true,'valor_trabalho',100,'valor_pago',0)));
 perform public.gestao_operar(a,'salvar',x);
 if exists(select 1 from public.gestao_equipe_extrato where colaborador_id=c) then raise exception 'FAIL draft balance';end if;
 -- Operators can change sales but cannot overwrite or read payroll.
 perform public.gestao_operar(b,'salvar',(x-'equipe')||jsonb_build_object('versao',1));
 if (select count(*) from public.gestao_fechamento_equipe where fechamento_id=f1)<>1 then raise exception 'FAIL preserved manager draft';end if;
 begin perform public.gestao_operar(b,'salvar',x||jsonb_build_object('versao',2,'equipe','[]'::jsonb));raise exception 'FAIL operator team';exception when raise_exception then if sqlerrm not like '%gerenciada por um gestor%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',b::text,true);set local role authenticated;
 select count(*) into n from public.gestao_fechamento_equipe where fechamento_id=f1;if n<>0 then raise exception 'FAIL operator RLS';end if;
 reset role;
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f1,'unidade_id',u,'versao',2));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f1,'unidade_id',u,'versao',2));
 if (select count(*) from public.gestao_equipe_extrato where fechamento_id=f1)<>1 then raise exception 'FAIL confirmation idempotency';end if;
 if (select saldo_final from public.gestao_fechamento_equipe where fechamento_id=f1)<>100 then raise exception 'FAIL unpaid accrual';end if;
 -- Duplicate presence is rejected atomically, including stock.
 perform public.gestao_operar(a,'salvar',x||jsonb_build_object('id',f4,'origem','duplicado'));
 begin perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f4,'unidade_id',u,'versao',1));raise exception 'FAIL duplicate presence';exception when raise_exception then if sqlerrm not like '%já foi registrada%' then raise;end if;end;
 if exists(select 1 from public.gestao_equipe_extrato where fechamento_id=f4) then raise exception 'FAIL duplicate atomicity';end if;
 -- Next day: earn 100, pay only 50, carry forward 150.
 perform public.gestao_operar(a,'salvar',jsonb_set(x||jsonb_build_object('id',f2,'data',current_date-3),'{equipe,0,valor_pago}','50'));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f2,'unidade_id',u,'versao',1));
 if (select saldo_final from public.gestao_fechamento_equipe where fechamento_id=f2)<>150 then raise exception 'FAIL partial payment';end if;
 -- No attendance, inactive collaborator: settle previous days.
 update public.gestao_colaboradores set ativo=false where id=c;
 team:=jsonb_build_array(jsonb_build_object('colaborador_id',c,'presente',false,'valor_trabalho',0,'valor_pago',151));
 perform public.gestao_operar(a,'salvar',x||jsonb_build_object('id',f3,'data',current_date-2,'equipe',team));
 begin perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f3,'unidade_id',u,'versao',1));raise exception 'FAIL excessive payment';exception when raise_exception then if sqlerrm not like '%supera o saldo%' then raise;end if;end;
 if (select saldo from public.gestao_produtos where id=p)<>-2 then raise exception 'FAIL overpay stock atomicity';end if;
 team:=jsonb_set(team,'{0,valor_pago}','150');
 perform public.gestao_operar(a,'salvar',x||jsonb_build_object('id',f3,'versao',1,'data',current_date-2,'equipe',team));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f3,'unidade_id',u,'versao',2));
 if (select saldo_final from public.gestao_fechamento_equipe where fechamento_id=f3)<>0 then raise exception 'FAIL absent settlement';end if;
 begin perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f1,'unidade_id',u,'versao',3,'motivo','Corrigir teste'));raise exception 'FAIL dependent reopening';exception when raise_exception then if sqlerrm not like '%lançamentos posteriores%' then raise;end if;end;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f3,'unidade_id',u,'versao',3,'motivo','Corrigir teste'));
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f2,'unidade_id',u,'versao',2,'motivo','Corrigir teste'));
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f1,'unidade_id',u,'versao',3,'motivo','Corrigir teste'));
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f1,'unidade_id',u,'versao',3,'motivo','Corrigir teste'));
 if exists(select 1 from public.gestao_equipe_extrato where colaborador_id=c and not estornado) then raise exception 'FAIL reopen reversal';end if;
 if (select count(*) from public.gestao_equipe_extrato where colaborador_id=c)<>4 then raise exception 'FAIL audit retained';end if;
 if (select saldo from public.gestao_produtos where id=p)<>0 then raise exception 'FAIL stock reversal';end if;
 -- A team-only closing remains possible on a day without sales.
 update public.gestao_colaboradores set ativo=true where id=c;
 x:=x||jsonb_build_object('id',gen_random_uuid(),'data',current_date,'itens','[]'::jsonb,'pagamentos','[]'::jsonb);
 perform public.gestao_operar(a,'salvar',x);
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',x->>'id','unidade_id',u,'versao',1));
 if not exists(select 1 from public.gestao_fechamento_equipe where fechamento_id=(x->>'id')::uuid and saldo_final=100) then raise exception 'FAIL no-sales closing';end if;
 begin perform public.gestao_operar(a,'salvar',x||jsonb_build_object('id',gen_random_uuid(),'origem','vazio','equipe','[]'::jsonb));raise exception 'FAIL empty closing';exception when raise_exception then if sqlerrm not like '%produtos vendidos, despesas ou lançamentos%' then raise;end if;end;
 -- Closed legacy workflows cannot mutate the migrated balances.
 begin perform public.gestao_equipe_operar(a,'pagar',jsonb_build_object('id',gen_random_uuid(),'unidade_id',u));raise exception 'FAIL old entry point';exception when raise_exception then if sqlerrm not like '%dentro do fechamento%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',outsider::text,true);set local role authenticated;
 select count(*) into n from public.gestao_equipe_extrato where colaborador_id=c;if n<>0 then raise exception 'FAIL tenant RLS';end if;reset role;
 perform set_config('request.jwt.claim.sub',a::text,true);set local role authenticated;
 select count(*) into n from public.gestao_equipe_extrato where colaborador_id=c;if n<>5 then raise exception 'FAIL manager RLS';end if;
 if has_table_privilege('authenticated','public.gestao_equipe_extrato','insert') or has_function_privilege('authenticated','public.gestao_operar(uuid,text,jsonb)','execute') then raise exception 'FAIL permissions';end if;reset role;
end $$;
select 'PASS: draft isolation, operator preservation/RLS, accrual, partial payment, absent/inactive settlement, overpay/duplicate prevention, atomic stock, idempotency, dependent reopening and reversals, legacy lockout, tenant isolation' result;
rollback;

