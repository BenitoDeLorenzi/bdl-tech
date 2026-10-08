begin;
do $$
declare a uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); u uuid; u2 uuid; m uuid; c uuid; p uuid; r jsonb; r2 jsonb; x jsonb;
begin
 insert into auth.users(id,email) values(a,a||'@registration.test');
 insert into public.perfis(id,nome,role,ativo) values(a,'Teste cadastro','bdl_admin',true);
 insert into public.empresas(id,nome,status) values(e,'Cadastro teste','active');
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 insert into public.gestao_unidades(empresa_id,nome) values(e,'Outra unidade') returning id into u2;
 select id into c from public.gestao_categorias where empresa_id=e limit 1;
 r:=public.gestao_reservar_codigo(a,u); r2:=public.gestao_reservar_codigo(a,u);
 if r->>'codigo'=r2->>'codigo' then raise exception 'FAIL duplicate reservations';end if;
 x:=jsonb_build_object('unidade_id',u,'nome','Produto sem preço','categoria_id',c,'unidade','un','minimo',0,'ativo',true,'reserva_id',r->>'reserva_id','preco','','custo',999);
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('unidade_id',u2));
 raise exception 'FAIL other unit consumed code';
 exception when raise_exception then if sqlerrm not like '%Código indisponível%' then raise;end if;end;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('nome','X'));
 raise exception 'FAIL invalid product';
 exception when check_violation then null;end;
 if not exists(select 1 from gestao_private.codigos_reservados where id=(r->>'reserva_id')::uuid) then raise exception 'FAIL failed save consumed code';end if;
 p:=public.gestao_operar(a,'produto',x);
 if (select codigo from public.gestao_produtos where id=p) is distinct from (r->>'codigo')::bigint then raise exception 'FAIL displayed code changed';end if;
 if (select preco from public.gestao_produtos where id=p) is not null then raise exception 'FAIL blank price';end if;
 if (select custo from public.gestao_produtos where id=p)<>0 then raise exception 'FAIL manual cost accepted';end if;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('nome','Reused code'));
 raise exception 'FAIL reused reservation';
 exception when raise_exception then if sqlerrm not like '%Código indisponível%' then raise;end if;end;
 update public.gestao_produtos set custo=2.75 where id=p;
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',1,'preco','0.00'));
 if (select preco from public.gestao_produtos where id=p) is distinct from 0 then raise exception 'FAIL zero price';end if;
 if (select custo from public.gestao_produtos where id=p)<>2.75 then raise exception 'FAIL existing cost overwritten';end if;
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',2,'preco','1234.56'));
 if (select preco from public.gestao_produtos where id=p)<>1234.56 then raise exception 'FAIL reference price';end if;
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',3,'preco',''));
 if (select preco from public.gestao_produtos where id=p) is not null then raise exception 'FAIL clear price';end if;
 update gestao_private.codigos_reservados set criado_em=now()-interval '2 days' where id=(r2->>'reserva_id')::uuid;
 begin
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('nome','Expired code','reserva_id',r2->>'reserva_id'));
 raise exception 'FAIL expired reservation';
 exception when raise_exception then if sqlerrm not like '%Código indisponível%' then raise;end if;end;
end $$;
select 'PASS: unique reserved code, same code on save, rollback and reuse protection, unit scope, expiration, optional/zero/reference prices, preserved cost' result;
rollback;
