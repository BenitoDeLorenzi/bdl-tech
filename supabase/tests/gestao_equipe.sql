begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); e2 uuid:=gen_random_uuid(); u uuid; m uuid; c uuid:=gen_random_uuid();x jsonb; op text;
begin
 insert into auth.users(id,email) values(a,a||'@teamcatalog.test'),(b,b||'@teamcatalog.test');
 insert into public.empresas(id,nome,status) values(e,'Equipe cadastro teste','active'),(e2,'Outra equipe teste','active');
 insert into public.perfis(id,nome,role,ativo,prefeitura_id) values(a,'Gestor equipe','municipal_admin',true,e),(b,'Outro gestor','municipal_admin',true,e2);
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0),(e2,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 x:=jsonb_build_object('id',c,'unidade_id',u,'versao',0,'nome','Ana teste','funcao','Atendente','valor',100);
 perform public.gestao_equipe_operar(a,'colaborador',x);
 begin perform public.gestao_equipe_operar(b,'colaborador',x||jsonb_build_object('versao',1));raise exception 'FAIL tenant';exception when raise_exception then if sqlerrm not like '%acesso de gestor%' then raise;end if;end;
 begin perform public.gestao_equipe_operar(a,'colaborador',x||jsonb_build_object('versao',1,'valor','NaN'));raise exception 'FAIL NaN';exception when raise_exception then if sqlerrm not like '%valor positivo%' then raise;end if;end;
 perform public.gestao_equipe_operar(a,'colaborador',x||jsonb_build_object('versao',1,'valor',150,'ativo',false));
 if not exists(select 1 from public.gestao_colaboradores where id=c and valor=150 and not ativo and versao=2) then raise exception 'FAIL update';end if;
 begin perform public.gestao_equipe_operar(a,'colaborador',x||jsonb_build_object('versao',1));raise exception 'FAIL stale';exception when raise_exception then if sqlerrm not like '%Cadastro alterado%' then raise;end if;end;
 foreach op in array array['trabalho','pagar','cancelar_trabalho','estornar_pagamento'] loop
   begin perform public.gestao_equipe_operar(a,op,x);raise exception 'FAIL legacy mutation';exception when raise_exception then if sqlerrm not like '%dentro do fechamento%' then raise;end if;end;
 end loop;
end $$;
select 'PASS: employee creation/update, positive values, version checks, tenant checks, retired standalone mutations' result;
rollback;
