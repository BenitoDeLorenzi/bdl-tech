begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();e uuid:=gen_random_uuid();u uuid;m uuid;bad numeric;n integer;
begin
 insert into auth.users(id,email) values(a,a||'@fees.test'),(b,b||'@fees.test');
 insert into public.empresas(id,nome,status) values(e,'Teste taxas','active');
 insert into public.perfis(id,nome,role,ativo,prefeitura_id) values(a,'Gestor','municipal_admin',true,e),(b,'Operador','municipal_user',true,e);
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0);
 insert into public.usuario_modulos(usuario_id,prefeitura_id,modulo_id) values(b,e,m);
 select id into u from public.gestao_unidades where empresa_id=e;
 perform public.gestao_salvar_taxa(a,u,'Crédito',3.25,0);
 if (select percentual from public.gestao_taxas_recebimento where unidade_id=u and forma='Crédito')<>3.25 then raise exception 'FAIL saved';end if;
 begin perform public.gestao_salvar_taxa(b,u,'Pix',1,0);raise exception 'FAIL permission';exception when raise_exception then if sqlerrm not like '%Somente um gestor%' then raise;end if;end;
 begin perform public.gestao_salvar_taxa(a,u,'Crédito',4,0);raise exception 'FAIL stale';exception when raise_exception then if sqlerrm not like '%alterada%' then raise;end if;end;
 foreach bad in array array[-1,101,1.234,'NaN'::numeric] loop
  begin perform public.gestao_salvar_taxa(a,u,'Pix',bad,0);raise exception 'FAIL invalid';exception when raise_exception then if sqlerrm not like '%Informe uma taxa%' then raise;end if;end;
 end loop;
 perform public.gestao_salvar_taxa(a,u,'Crédito',0,1);
 perform set_config('request.jwt.claim.sub',b::text,true);set local role authenticated;
 select count(*) into n from public.gestao_taxas_recebimento where unidade_id=u;
 if n<>1 then raise exception 'FAIL operator read';end if;
 reset role;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);set local role authenticated;
 select count(*) into n from public.gestao_taxas_recebimento where unidade_id=u;
 if n<>0 then raise exception 'FAIL RLS';end if;
 reset role;
 if has_function_privilege('authenticated','public.gestao_salvar_taxa(uuid,uuid,text,numeric,integer)','EXECUTE') then raise exception 'FAIL direct rpc';end if;
end $$;
select 'PASS: save/update, zero rate, decimal validation, stale edits, manager authorization, operator read, tenant isolation and API permissions' result;
rollback;
