begin;
do $$
declare a uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); u uuid; m uuid; c uuid; p uuid; p2 uuid; f uuid:=gen_random_uuid(); x jsonb; bad text;
begin
 insert into auth.users(id,email) values(a,a||'@closingprice.test');
 insert into public.perfis(id,nome,role,ativo) values(a,'Preço teste','bdl_admin',true);
 insert into public.empresas(id,nome,status) values(e,'Preço fechamento teste','active');
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 select id into c from public.gestao_categorias where empresa_id=e limit 1;
 p:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Com estoque','categoria_id',c,'unidade','un','minimo',0));
 p2:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Sem estoque','categoria_id',c,'unidade','un','minimo',0,'preco',7.5,'controlar_estoque',false));
 x:=jsonb_build_object('id',f,'versao',0,'unidade_id',u,'data',current_date,'turno','dia','origem','teste','itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',2,'preco_unitario',5,'total',9),jsonb_build_object('produto_id',p2,'quantidade',1,'preco_unitario',8,'total',8)),'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Conta','valor',16)));
 foreach bad in array array['-1','NaN','Infinity','1000000000','1.234'] loop
 begin
 perform public.gestao_operar(a,'salvar',x||jsonb_build_object('itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',1,'preco_unitario',bad,'total',9))));
 raise exception 'FAIL invalid unit price';
 exception when raise_exception then if sqlerrm not like '%preço unitário válido%' then raise;end if;end;
 end loop;
 perform public.gestao_operar(a,'salvar',x);
 if (select preco from public.gestao_produtos where id=p) is not null or (select preco from public.gestao_produtos where id=p2)<>7.5 then raise exception 'FAIL draft changed catalog';end if;
 if not exists(select 1 from public.gestao_fechamentos where id=f and itens @> jsonb_build_array(jsonb_build_object('produto_id',p,'preco_unitario',5,'total',9))) then raise exception 'FAIL snapshot and discount';end if;
 begin perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'versao',1,'unidade_id',u));raise exception 'FAIL imbalance';exception when raise_exception then if sqlerrm not like '%não conferem%' then raise;end if;end;
 if (select preco from public.gestao_produtos where id=p) is not null then raise exception 'FAIL failed confirmation price';end if;
 perform public.gestao_operar(a,'salvar',x||jsonb_build_object('versao',1,'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Conta','valor',17))));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'versao',2,'unidade_id',u));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'versao',2,'unidade_id',u));
 if (select preco from public.gestao_produtos where id=p)<>5 or (select preco from public.gestao_produtos where id=p2)<>8 then raise exception 'FAIL confirmed catalog';end if;
 if (select versao from public.gestao_produtos where id=p)<>2 or (select saldo from public.gestao_produtos where id=p)<>-2 then raise exception 'FAIL repeated confirmation';end if;
 if exists(select 1 from public.gestao_movimentos where produto_id=p2) then raise exception 'FAIL nonstock ledger';end if;
 if (select count(*) from public.gestao_auditoria where empresa_id=e and acao='preco_fechamento')<>2 then raise exception 'FAIL price audit';end if;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'versao',3,'unidade_id',u,'motivo','Correção teste'));
 if (select saldo from public.gestao_produtos where id=p)<>0 or (select preco from public.gestao_produtos where id=p)<>5 then raise exception 'FAIL reopen';end if;
end $$;
select 'PASS: price validation, draft isolation, discounted total, atomic reconciliation, catalog updates including non-stock, idempotency, revision, audit, reopening' result;
rollback;

