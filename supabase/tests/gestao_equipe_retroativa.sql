begin;
do $$
declare a uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); u uuid; m uuid; c uuid:=gen_random_uuid(); c2 uuid:=gen_random_uuid(); f uuid:=gen_random_uuid(); x jsonb; y jsonb;
begin
 insert into auth.users(id,email) values(a,a||'@backdated.test');
 insert into public.empresas(id,nome,status) values(e,'Equipe retroativa teste','active');
 insert into public.perfis(id,nome,role,ativo,prefeitura_id) values(a,'Gestor teste','municipal_admin',true,e);
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-10,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 perform public.gestao_equipe_operar(a,'colaborador',jsonb_build_object('id',c,'unidade_id',u,'nome','Equipe retroativa','funcao','Atendente','valor',120));
 perform public.gestao_equipe_operar(a,'colaborador',jsonb_build_object('id',c2,'unidade_id',u,'nome','Equipe intermediária','funcao','Atendente','valor',100));
 insert into public.gestao_equipe_extrato(empresa_id,unidade_id,colaborador_id,tipo,data,valor,nome,criado_por) values
 (e,u,c,'trabalho',current_date-2,120,'Equipe retroativa',a),
 (e,u,c,'trabalho',current_date-1,120,'Equipe retroativa',a),
 (e,u,c,'pagamento',current_date-1,240,'Equipe retroativa',a),
 (e,u,c2,'trabalho',current_date-4,100,'Equipe intermediária',a),
 (e,u,c2,'pagamento',current_date-2,100,'Equipe intermediária',a),
 (e,u,c2,'trabalho',current_date,200,'Equipe intermediária',a);
 x:=jsonb_build_object('id',f,'unidade_id',u,'versao',0,'data',current_date-4,'turno','dia','origem','teste','itens','[]'::jsonb,'pagamentos','[]'::jsonb,'equipe',jsonb_build_array(jsonb_build_object('colaborador_id',c,'presente',true,'valor_trabalho',120,'valor_pago',0)));
 perform public.gestao_operar(a,'salvar',x);
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 if (select sum(case when tipo='trabalho' then valor else -valor end) from public.gestao_equipe_extrato where colaborador_id=c and not estornado)<>120 then raise exception 'FAIL backdated accrual';end if;
 -- Payment older than all work cannot consume future earnings, even with a positive current balance.
 y:=x||jsonb_build_object('id',gen_random_uuid(),'data',current_date-5,'equipe',jsonb_build_array(jsonb_build_object('colaborador_id',c,'presente',false,'valor_trabalho',0,'valor_pago',50)));
 perform public.gestao_operar(a,'salvar',y);
 begin perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',y->>'id','unidade_id',u,'versao',1));raise exception 'FAIL future earnings';exception when raise_exception then if sqlerrm not like '%saldo negativo na data%' then raise;end if;end;
 -- A backdated payment with funds in that period is valid despite later activity.
 y:=y||jsonb_build_object('id',gen_random_uuid(),'data',current_date-3);
 perform public.gestao_operar(a,'salvar',y);
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',y->>'id','unidade_id',u,'versao',1));
 if (select sum(case when tipo='trabalho' then valor else -valor end) from public.gestao_equipe_extrato where colaborador_id=c and not estornado)<>70 then raise exception 'FAIL backdated payment';end if;
 -- Current and payment-date balances are positive, but a later settled payment needs those funds.
 y:=y||jsonb_build_object('id',gen_random_uuid(),'origem','intermediario','equipe',jsonb_build_array(jsonb_build_object('colaborador_id',c2,'presente',false,'valor_trabalho',0,'valor_pago',50)));
 perform public.gestao_operar(a,'salvar',y);
 begin perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',y->>'id','unidade_id',u,'versao',1));raise exception 'FAIL intermediate overdraft';exception when raise_exception then if sqlerrm not like '%saldo negativo na data%' then raise;end if;end;
 if exists(select 1 from public.gestao_equipe_extrato where fechamento_id=(y->>'id')::uuid) then raise exception 'FAIL atomic rejection';end if;
end $$;
select 'PASS: retroactive unpaid work, valid retroactive payment, future earnings protection, intermediate balance protection and atomic rejection' result;
rollback;
