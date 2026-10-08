begin;
do $$
declare a uuid := gen_random_uuid(); o uuid := gen_random_uuid(); other_user uuid := gen_random_uuid();
 u uuid; u2 uuid; e uuid:=gen_random_uuid(); e2 uuid:=gen_random_uuid(); m uuid; p uuid; p2 uuid; f uuid:=gen_random_uuid(); payload jsonb; n numeric;
begin
 insert into auth.users(id,email) values(a,a||'@gestao.test'),(o,o||'@gestao.test'),(other_user,other_user||'@gestao.test');
 insert into public.perfis(id,nome,role,ativo) values(a,'Teste admin','bdl_admin',true),(o,'Teste operador','municipal_user',true),(other_user,'Teste outro','municipal_user',true);
 insert into public.empresas(id,nome,status) values(e,'Teste A','active'),(e2,'Teste B','active');
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual)
 values(e,m,'active',current_date-1,current_date+1,0),(e2,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 select id into u2 from public.gestao_unidades where empresa_id=e2;
 update public.perfis set prefeitura_id=e where id=o;
 perform public.atualizar_usuario_acessos(a,o,e,array[m],array[]::uuid[]);
 p:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Água','categoria_id',(select id from public.gestao_categorias where empresa_id=e limit 1),'custo',2,'unidade','un','preco',5,'minimo',5));
 p2:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u2,'nome','Água B','categoria_id',(select id from public.gestao_categorias where empresa_id=e2 limit 1),'custo',2,'unidade','un','preco',5,'minimo',5));
 perform public.gestao_operar(a,'movimento',jsonb_build_object('unidade_id',u,'produto_id',p,'tipo','entrada','quantidade',100,'motivo','Saldo inicial'));
 payload:=jsonb_build_object('id',f,'versao',0,'unidade_id',u,'data','2026-09-23','turno','dia','origem','sistema','itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',10,'total',50)),'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Conta','valor',50)));
 perform public.gestao_operar(o,'salvar',payload);
 select saldo into n from public.gestao_produtos where id=p;
 if n<>100 then raise exception 'TEST FAIL draft changed stock'; end if;
 begin
   perform public.gestao_operar(o,'confirmar',jsonb_build_object('unidade_id',u,'id',f,'versao',1));
   raise exception 'TEST FAIL operator confirmed';
 exception when raise_exception then if sqlerrm not like '%exige acesso de gestor%' then raise; end if;
 end;
 begin
   perform public.gestao_operar(other_user,'salvar',payload);
   raise exception 'TEST FAIL tenant isolation';
 exception when raise_exception then if sqlerrm not like '%sem acesso vigente%' then raise; end if;
 end;
 begin
   perform public.gestao_operar(o,'salvar',payload||jsonb_build_object('versao',1,'itens',jsonb_build_array(jsonb_build_object('produto_id',p2,'quantidade',10,'total',50))));
   raise exception 'TEST FAIL foreign product';
 exception when raise_exception then if sqlerrm not like '%Produto inválido%' then raise; end if;
 end;
 begin
   perform public.gestao_operar(o,'salvar',payload);
   raise exception 'TEST FAIL stale revision';
 exception when raise_exception then if sqlerrm not like '%Outro usuário alterou%' then raise; end if;
 end;
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('unidade_id',u,'id',f,'versao',1));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('unidade_id',u,'id',f,'versao',1));
 select saldo into n from public.gestao_produtos where id=p;
 if n<>90 then raise exception 'TEST FAIL double confirmation: %',n; end if;
 if (select count(*) from public.gestao_movimentos where fechamento_id=f)<>1 then raise exception 'TEST FAIL duplicated movement'; end if;
 begin
   perform public.gestao_operar(o,'salvar',payload||'{"versao":2}');
   raise exception 'TEST FAIL edit confirmed';
 exception when raise_exception then if sqlerrm not like '%já conferido%' then raise; end if;
 end;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('unidade_id',u,'id',f,'versao',2,'motivo','Correção teste'));
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('unidade_id',u,'id',f,'versao',2,'motivo','Correção teste'));
 select saldo into n from public.gestao_produtos where id=p;
 if n<>100 then raise exception 'TEST FAIL reversal'; end if;
 perform public.gestao_operar(o,'salvar',payload||jsonb_build_object('versao',3,'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Conta','valor',49))));
 begin
   perform public.gestao_operar(a,'confirmar',jsonb_build_object('unidade_id',u,'id',f,'versao',4));
   raise exception 'TEST FAIL imbalance accepted';
 exception when raise_exception then if sqlerrm not like '%não conferem%' then raise; end if;
 end;
 if (select saldo from public.gestao_produtos where id=p)<>100 then raise exception 'TEST FAIL failed confirm not atomic'; end if;
 perform public.gestao_operar(o,'salvar',payload||'{"versao":4}');
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('unidade_id',u,'id',f,'versao',5));
 if (select saldo from public.gestao_produtos where id=p)<>90 then raise exception 'TEST FAIL reconfirm'; end if;
 perform set_config('request.jwt.claim.sub',o::text,true);
 perform set_config('gestao.test_empresa',e::text,true);
end $$;
set local role authenticated;
do $$
begin
 if (select count(*) from public.gestao_empresas)<>1 then raise exception 'TEST FAIL RLS companies'; end if;
 if exists(select 1 from public.gestao_produtos where empresa_id<>current_setting('gestao.test_empresa')::uuid) then raise exception 'TEST FAIL RLS products'; end if;
 if (select count(*) from public.gestao_produtos)<>1 then raise exception 'TEST FAIL RLS membership'; end if;
 begin
   update public.gestao_produtos set saldo=500;
   raise exception 'TEST FAIL direct write allowed';
 exception when insufficient_privilege then null;
 end;
 begin
   perform public.gestao_operar(current_setting('request.jwt.claim.sub')::uuid,'empresa','{}');
   raise exception 'TEST FAIL RPC exposed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
   perform count(*) from public.gestao_empresas;
   raise exception 'TEST FAIL anonymous read';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select 'PASS: drafts, role checks, tenant isolation, foreign products, optimistic locking, idempotent confirmation/reversal, reconciliation, atomicity, RLS, denied direct writes and anonymous access' as result;
rollback;
