begin;
do $$
declare a uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); u uuid; m uuid; c uuid; p uuid; f uuid:=gen_random_uuid(); x jsonb; bad text; saved public.gestao_fechamentos%rowtype;
begin
 insert into auth.users(id,email) values(a,a||'@closingfees.test');
 insert into public.perfis(id,nome,role,ativo) values(a,'Fechamento teste','bdl_admin',true);
 insert into public.empresas(id,nome,status) values(e,'Fechamento taxas teste','active');
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 select id into c from public.gestao_categorias where empresa_id=e limit 1;
 p:=public.gestao_operar(a,'produto',jsonb_build_object('unidade_id',u,'nome','Água teste','categoria_id',c,'unidade','un','minimo',0,'preco',100));
 x:=jsonb_build_object('id',f,'versao',0,'unidade_id',u,'data',current_date,'turno','dia','origem','teste',
   'itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',1,'preco_unitario',100,'total',100)),
   'pagamentos',jsonb_build_array(jsonb_build_object('forma','Crédito','origem','Máquina A','valor',100,'taxa_percentual',2.5,'valor_taxa',0,'valor_liquido',999)),
   'despesas',jsonb_build_array(jsonb_build_object('descricao',' Compra de gelo ','valor',15)));
 foreach bad in array array['-1','100.01','NaN','Infinity','1.234'] loop
   begin perform public.gestao_operar(a,'salvar',jsonb_set(x,'{pagamentos,0,taxa_percentual}',to_jsonb(bad)));raise exception 'FAIL invalid fee';
   exception when raise_exception then if sqlerrm not like '%taxa entre%' then raise;end if;end;
 end loop;
 foreach bad in array array['0','-1','NaN','Infinity','1.234','1000000000'] loop
   begin perform public.gestao_operar(a,'salvar',jsonb_set(x,'{despesas,0,valor}',to_jsonb(bad)));raise exception 'FAIL invalid expense';
   exception when raise_exception then if sqlerrm not like '%cada despesa%' then raise;end if;end;
 end loop;
 begin perform public.gestao_operar(a,'salvar',jsonb_set(x,'{despesas,0,descricao}','" "'));raise exception 'FAIL empty expense';
 exception when raise_exception then if sqlerrm not like '%cada despesa%' then raise;end if;end;
 perform public.gestao_operar(a,'salvar',x);
 select * into saved from public.gestao_fechamentos where id=f;
 if saved.pagamentos->0->>'valor_taxa'<>'2.50' or saved.pagamentos->0->>'valor_liquido'<>'97.50' then raise exception 'FAIL trusted fee computation %',saved.pagamentos;end if;
 if saved.despesas->0->>'descricao'<>'Compra de gelo' or saved.total<>100 then raise exception 'FAIL expenses/gross';end if;
 perform public.gestao_operar(a,'confirmar',jsonb_build_object('id',f,'versao',1,'unidade_id',u));
 if (select saldo from public.gestao_produtos where id=p)<>-1 then raise exception 'FAIL gross reconciliation/stock';end if;
 perform public.gestao_operar(a,'reabrir',jsonb_build_object('id',f,'versao',2,'unidade_id',u,'motivo','Correção teste'));
 if (select despesas from public.gestao_fechamentos where id=f)<>saved.despesas then raise exception 'FAIL reopening expense history';end if;
 -- An older client payload remains compatible; omitted fields default to zero and empty.
 perform public.gestao_operar(a,'salvar',(x-'despesas')||jsonb_build_object('versao',3,'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Conta','valor',100))));
 select * into saved from public.gestao_fechamentos where id=f;
 if saved.despesas<>'[]' or (saved.pagamentos->0->>'valor_liquido')::numeric<>100 then raise exception 'FAIL legacy defaults';end if;
 -- Half-cent fees round upwards, just like the UI.
 perform public.gestao_operar(a,'salvar',x||jsonb_build_object('versao',4,'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Conta','valor',0.05,'taxa_percentual',10))));
 if (select (pagamentos->0->>'valor_taxa')::numeric from public.gestao_fechamentos where id=f)<>0.01 then raise exception 'FAIL rounding';end if;
 if has_function_privilege('authenticated','public.gestao_operar(uuid,text,jsonb)','execute') then raise exception 'FAIL public RPC';end if;
end $$;
select 'PASS: fee validation and server computation, expense validation, gross reconciliation, stock, reopen history, legacy defaults, exact rounding' result;
rollback;
