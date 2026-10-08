begin;
do $$
declare a uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); u uuid; m uuid; c uuid; p uuid; x jsonb; bad text;
begin
 insert into auth.users(id,email) values(a,a||'@cost.test');
 insert into public.perfis(id,nome,role,ativo) values(a,'Teste custo','bdl_admin',true);
 insert into public.empresas(id,nome,status) values(e,'Teste custo','active');
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 select id into c from public.gestao_categorias where empresa_id=e limit 1;
 p:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Produto custo','categoria_id',c,'unidade','kg','minimo',0));
 x:=jsonb_build_object('unidade_id',u,'produto_id',p,'tipo','entrada','quantidade',2.5,'motivo','Compra teste');
 perform public.gestao_operar(a,'movimento',x||'{"custo_unitario":"3.25"}');
 if not exists(select 1 from public.gestao_movimentos where produto_id=p and custo_unitario=3.25 and custo_total=8.13) then raise exception 'FAIL fractional total';end if;
 perform public.gestao_operar(a,'movimento',x||'{"custo_unitario":"4.00"}');
 if (select count(distinct custo_unitario) from public.gestao_movimentos where produto_id=p)<>2 then raise exception 'FAIL historical cost';end if;
 perform public.gestao_operar(a,'movimento',x);
 perform public.gestao_operar(a,'movimento',x||'{"custo_unitario":"0.00"}');
 if not exists(select 1 from public.gestao_movimentos where produto_id=p and custo_unitario is null and custo_total is null) or not exists(select 1 from public.gestao_movimentos where produto_id=p and custo_total=0) then raise exception 'FAIL null vs zero';end if;
 foreach bad in array array['-1','NaN','Infinity','1000000000','1.234'] loop
 begin
 perform public.gestao_operar(a,'movimento',x||jsonb_build_object('custo_unitario',bad));
 raise exception 'FAIL invalid cost %',bad;
 exception when raise_exception then if sqlerrm not like '%custo unitário válido%' then raise;end if;end;
 end loop;
 begin perform public.gestao_operar(a,'movimento',x||'{"tipo":"perda","custo_unitario":"2.00"}');raise exception 'FAIL cost on loss';exception when raise_exception then if sqlerrm not like '%custo unitário válido%' then raise;end if;end;
 if (select saldo from public.gestao_produtos where id=p)<>10 then raise exception 'FAIL rejected write changed stock';end if;
 perform public.gestao_operar(a,'movimento',x||'{"tipo":"perda","quantidade":1}');
 if not exists(select 1 from public.gestao_movimentos where produto_id=p and tipo='perda' and quantidade=-1 and custo_unitario is null) then raise exception 'FAIL loss regression';end if;
end $$;
select 'PASS: optional/zero costs, fractional total rounding, cost history, invalid costs, loss, atomic stock' result;
rollback;

