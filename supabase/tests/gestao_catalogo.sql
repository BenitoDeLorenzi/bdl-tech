begin;
do $$
declare a uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); e2 uuid:=gen_random_uuid(); u uuid; u2 uuid; m uuid; c uuid; c2 uuid; p uuid; f uuid:=gen_random_uuid(); x jsonb; n bigint;
begin
 insert into auth.users(id,email) values(a,a||'@catalog.test'),(o,o||'@catalog.test');
 insert into public.empresas(id,nome,status) values(e,'Catálogo teste A','active'),(e2,'Catálogo teste B','active');
 insert into public.perfis(id,nome,role,ativo,prefeitura_id) values(a,'Teste catálogo','bdl_admin',true,null),(o,'Operador catálogo','municipal_user',true,e);
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0),(e2,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 select id into u2 from public.gestao_unidades where empresa_id=e2;
 if (select count(*) from public.gestao_categorias where empresa_id=e)<>13 then raise exception 'FAIL base categories'; end if;
 select id into c from public.gestao_categorias where empresa_id=e and nome='Drinks e coquetéis';
 select id into c2 from public.gestao_categorias where empresa_id=e2 limit 1;
 perform public.atualizar_usuario_acessos(a,o,e,array[m],array[]::uuid[]);
 begin
 perform public.gestao_operar(o,'categoria',jsonb_build_object('unidade_id',u,'nome','Negada'));
 raise exception 'FAIL operator category';
 exception when raise_exception then if sqlerrm not like '%exige acesso de gestor%' then raise;end if;end;
 begin
 perform public.gestao_operar(a,'categoria',jsonb_build_object('unidade_id',u,'nome',' drinks e coquetéis '));
 raise exception 'FAIL duplicate category';
 exception when unique_violation then null; end;
 x:=jsonb_build_object('unidade_id',u,'nome','Drink teste','categoria_id',c,'custo',7.25,'preco',20.50,'unidade','un','minimo',9,'ativo',true,'controlar_estoque',false,'observacoes','Custo por dose');
 p:=public.gestao_operar(a,'produto',x);
 if (select custo from public.gestao_produtos where id=p)<>0 or (select minimo from public.gestao_produtos where id=p)<>0 then raise exception 'FAIL cost or no-stock minimum'; end if;
 select codigo into n from public.gestao_produtos where id=p;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('nome','Categoria alheia','categoria_id',c2));
 raise exception 'FAIL category isolation';
 exception when raise_exception then if sqlerrm not like '%categoria ativa desta empresa%' then raise;end if;end;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('nome','Negativo','preco',-1));
 raise exception 'FAIL negative price';
 exception when check_violation then null; end;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('nome','NaN custo','preco','NaN'));
 raise exception 'FAIL NaN price';
 exception when check_violation then null; end;
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',1,'nome','Drink atualizado','preco',25));
 if (select codigo from public.gestao_produtos where id=p)<>n then raise exception 'FAIL code changed'; end if;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',1));
 raise exception 'FAIL stale edit';
 exception when raise_exception then if sqlerrm not like '%Outro usuário alterou o produto%' then raise;end if;end;
 begin
 perform public.gestao_operar(a,'movimento',jsonb_build_object('unidade_id',u,'produto_id',p,'quantidade',1,'tipo','entrada','motivo','Teste entrada'));
 raise exception 'FAIL no-stock manual entry';
 exception when raise_exception then if sqlerrm not like '%não controla estoque%' then raise;end if;end;
 perform public.gestao_operar(o,'salvar',jsonb_build_object('id',f,'versao',0,'unidade_id',u,'data',current_date,'turno','dia','origem','teste','itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',2,'total',50)),'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Caixa','valor',50))));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('unidade_id',u,'id',f,'versao',1));
 if (select saldo from public.gestao_produtos where id=p)<>0 or exists(select 1 from public.gestao_movimentos where produto_id=p) then raise exception 'FAIL no-stock sale changed inventory';end if;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('unidade_id',u,'id',f,'versao',2,'motivo','Teste estorno'));
 if exists(select 1 from public.gestao_movimentos where produto_id=p) then raise exception 'FAIL no-stock reversal';end if;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',2,'controlar_estoque',true));
 raise exception 'FAIL changed historical control';
 exception when raise_exception then if sqlerrm not like '%não podem mudar%' then raise;end if;end;
 perform public.gestao_operar(a,'categoria',jsonb_build_object('unidade_id',u,'id',c,'versao',1,'nome','Coquetéis especiais','descricao','Receitas da casa','ativo',false));
 if (select count(*) from public.gestao_produtos gp join public.gestao_categorias gc on gc.id=gp.categoria_id where gp.id=p and gc.nome='Coquetéis especiais')<1 then raise exception 'FAIL rename relationship';end if;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('nome','Categoria inativa'));
 raise exception 'FAIL new inactive category assignment';
 exception when raise_exception then if sqlerrm not like '%categoria ativa%' then raise;end if;end;
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',2,'ativo',false));
 if (select ativo from public.gestao_produtos where id=p) then raise exception 'FAIL deactivate';end if;
 if not exists(select 1 from public.gestao_fechamentos where id=f) then raise exception 'FAIL history removed';end if;
 -- A new unit must not recreate the renamed category.
 insert into public.gestao_unidades(empresa_id,nome) values(e,'Segunda unidade');
 if (select count(*) from public.gestao_categorias where empresa_id=e)<>13 then raise exception 'FAIL reseeding renamed categories';end if;
 perform set_config('request.jwt.claim.sub',o::text,true);
 set local role authenticated;
 if (select count(*) from public.gestao_categorias)<>13 then raise exception 'FAIL category RLS isolation';end if;
 begin
 insert into public.gestao_categorias(empresa_id,nome) values(e,'Escrita direta');
 raise exception 'FAIL direct write';
 exception when insufficient_privilege then null;end;
 reset role;
end $$;
select 'PASS: seed, company isolation, roles, duplicates, category lifecycle, price validation, stable codes, optimistic edits, no-stock sales/reversal, history protection, RLS' as result;
rollback;