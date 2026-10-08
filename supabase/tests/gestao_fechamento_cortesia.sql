begin;
do $$
declare a uuid:=gen_random_uuid();e uuid:=gen_random_uuid();u uuid;m uuid;c uuid;p uuid;p2 uuid;f uuid:=gen_random_uuid();x jsonb;bad text;
begin
 insert into auth.users(id,email) values(a,a||'@courtesy.test');
 insert into public.perfis(id,nome,role,ativo) values(a,'Teste cortesia','bdl_admin',true);
 insert into public.empresas(id,nome,status) values(e,'Cortesia teste','active');
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 select id into c from public.gestao_categorias where empresa_id=e limit 1;
 p:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Água teste','categoria_id',c,'unidade','un','preco',5,'minimo',0));
 p2:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Sem controle','categoria_id',c,'unidade','un','minimo',0,'controlar_estoque',false));
 perform public.gestao_operar(a,'movimento',jsonb_build_object('unidade_id',u,'produto_id',p,'tipo','entrada','quantidade',100,'motivo','Saldo inicial teste'));
 x:=jsonb_build_object('id',f,'unidade_id',u,'versao',0,'data',current_date,'turno','dia','origem','teste','itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',10,'cortesia',2,'preco_unitario',5,'total',50)),'pagamentos',jsonb_build_array(jsonb_build_object('forma','Dinheiro','origem','Caixa','valor',50)));
 foreach bad in array array['-1','NaN','Infinity','1.0001','1000000000'] loop
  begin perform public.gestao_operar(a,'salvar',jsonb_set(x,'{itens,0,cortesia}',to_jsonb(bad)));raise exception 'FAIL invalid courtesy';exception when raise_exception then if sqlerrm not like '%Quantidade ou valor inválido%' then raise;end if;end;
 end loop;
 perform public.gestao_operar(a,'salvar',x);
 if (select saldo from public.gestao_produtos where id=p)<>100 then raise exception 'FAIL draft stock';end if;
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',1));
 if (select saldo from public.gestao_produtos where id=p)<>88 or (select total from public.gestao_fechamentos where id=f)<>50 then raise exception 'FAIL sold plus courtesy/revenue';end if;
 if (select quantidade from public.gestao_movimentos where fechamento_id=f and tipo='cortesia')<>-2 or (select quantidade from public.gestao_movimentos where fechamento_id=f and tipo='venda')<>-10 then raise exception 'FAIL separate movements';end if;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'unidade_id',u,'versao',2,'motivo','Correção teste'));
 if (select saldo from public.gestao_produtos where id=p)<>100 then raise exception 'FAIL complete reversal';end if;
 -- Courtesy only: no revenue, no required price, no catalog price change.
 x:=x||jsonb_build_object('versao',3,'itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',0,'cortesia',1.5,'preco_unitario',0,'total',0),jsonb_build_object('produto_id',p2,'quantidade',0,'cortesia',1,'total',0)),'pagamentos','[]'::jsonb);
 begin perform public.gestao_operar(a,'salvar',jsonb_set(x,'{itens,0,total}','1'));raise exception 'FAIL courtesy revenue';exception when raise_exception then if sqlerrm not like '%Quantidade ou valor inválido%' then raise;end if;end;
 begin perform public.gestao_operar(a,'salvar',jsonb_set(x,'{itens,0,cortesia}','0'));raise exception 'FAIL empty quantities';exception when raise_exception then if sqlerrm not like '%Quantidade ou valor inválido%' then raise;end if;end;
 perform public.gestao_operar(a,'salvar',x);
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'unidade_id',u,'versao',4));
 if (select saldo from public.gestao_produtos where id=p)<>98.5 or (select preco from public.gestao_produtos where id=p)<>5 then raise exception 'FAIL courtesy-only stock/price';end if;
 if (select total from public.gestao_fechamentos where id=f)<>0 or exists(select 1 from public.gestao_movimentos where produto_id=p2) then raise exception 'FAIL courtesy revenue/nonstock';end if;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'unidade_id',u,'versao',5,'motivo','Correção teste'));
 if (select saldo from public.gestao_produtos where id=p)<>100 then raise exception 'FAIL courtesy-only reversal';end if;
end $$;
select 'PASS: courtesy validation, draft isolation, mixed quantities, revenue exclusion, separate stock ledger, idempotency, complete reversal, fractional/courtesy-only and non-stock products, catalog price preservation' result;
rollback;
