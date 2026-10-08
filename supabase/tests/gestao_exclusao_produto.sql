begin;
do $$
declare a uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); e uuid:=gen_random_uuid(); u uuid; u2 uuid; m uuid; c uuid; p uuid; q uuid; f uuid:=gen_random_uuid(); x jsonb; closing jsonb;
begin
 insert into auth.users(id,email) values(a,a||'@deletion.test'),(o,o||'@deletion.test');
 insert into public.perfis(id,nome,role,ativo) values(a,'Delete admin','bdl_admin',true),(o,'Delete operador','municipal_user',true);
 insert into public.empresas(id,nome,status) values(e,'Delete teste','active');
 select id into m from public.modulos where slug='gestao-estabelecimentos';
 insert into public.licencas(prefeitura_id,modulo_id,status,inicio,fim,valor_anual) values(e,m,'active',current_date-1,current_date+1,0);
 select id into u from public.gestao_unidades where empresa_id=e;
 insert into public.gestao_unidades(empresa_id,nome) values(e,'Outra unidade') returning id into u2;
 update public.perfis set prefeitura_id=e where id=o;
 perform public.atualizar_usuario_acessos(a,o,e,array[m],array[]::uuid[]);
 select id into c from public.gestao_categorias where empresa_id=e limit 1;
 x:=jsonb_build_object('unidade_id',u,'nome','Produto exclusão','categoria_id',c,'unidade','un','minimo',0,'ativo',true);
 p:=public.gestao_operar(a,'produto',x);
 begin perform public.gestao_excluir_produto(o,u,p,1); raise exception 'FAIL operator'; exception when raise_exception then if sqlerrm not like '%exige acesso de gestor%' then raise;end if;end;
 begin perform public.gestao_excluir_produto(a,u2,p,1); raise exception 'FAIL scope'; exception when raise_exception then if sqlerrm not like '%não encontrado%' then raise;end if;end;
 begin perform public.gestao_excluir_produto(a,u,p,9); raise exception 'FAIL version'; exception when raise_exception then if sqlerrm not like '%Outro usuário%' then raise;end if;end;
 update public.gestao_produtos set saldo=1 where id=p;
 begin perform public.gestao_excluir_produto(a,u,p,1); raise exception 'FAIL positive stock'; exception when raise_exception then if sqlerrm not like '%saldo em estoque%' then raise;end if;end;
 update public.gestao_produtos set saldo=-1 where id=p;
 begin perform public.gestao_excluir_produto(a,u,p,1); raise exception 'FAIL negative stock'; exception when raise_exception then if sqlerrm not like '%saldo em estoque%' then raise;end if;end;
 update public.gestao_produtos set saldo=0 where id=p;
 perform public.gestao_excluir_produto(a,u,p,1);
 if exists(select 1 from public.gestao_produtos where id=p) or not exists(select 1 from public.gestao_auditoria where registro_id=p and acao='excluir_produto' and dados->'anterior'->>'nome'='Produto exclusão') then raise exception 'FAIL delete/audit';end if;
 p:=public.gestao_operar(a,'produto',x);
 perform public.gestao_operar(a,'movimento',jsonb_build_object('unidade_id',u,'produto_id',p,'tipo','entrada','quantidade',1,'motivo','Teste entrada'));
 perform public.gestao_operar(a,'movimento',jsonb_build_object('unidade_id',u,'produto_id',p,'tipo','consumo','quantidade',1,'motivo','Teste consumo'));
 begin perform public.gestao_excluir_produto(a,u,p,1); raise exception 'FAIL zero balance history'; exception when raise_exception then if sqlerrm not like '%possui histórico%' then raise;end if;end;
 perform public.gestao_operar(a,'produto',x||jsonb_build_object('id',p,'versao',1,'ativo',false));
 if (select ativo from public.gestao_produtos where id=p) or (select count(*) from public.gestao_movimentos where produto_id=p)<>2 then raise exception 'FAIL inactivation';end if;
 q:=public.gestao_operar(a,'produto',x||'{"nome":"Produto rascunho","controlar_estoque":false}');
 closing:=jsonb_build_object('id',f,'versao',0,'unidade_id',u,'data',current_date,'turno','dia','origem','teste','itens',jsonb_build_array(jsonb_build_object('produto_id',q,'quantidade',1,'total',5)),'pagamentos',jsonb_build_array(jsonb_build_object('forma','Pix','origem','Conta','valor',5)));
 perform public.gestao_operar(a,'salvar',closing);
 begin perform public.gestao_excluir_produto(a,u,q,1); raise exception 'FAIL draft'; exception when raise_exception then if sqlerrm not like '%possui histórico%' then raise;end if;end;
 -- Remove the product from the current draft; the previous snapshot must still protect it.
 p:=public.gestao_operar(a,'produto',x||'{"nome":"Outro produto"}');
 perform public.gestao_operar(a,'salvar',closing||jsonb_build_object('versao',1,'itens',jsonb_build_array(jsonb_build_object('produto_id',p,'quantidade',1,'total',5))));
 begin perform public.gestao_excluir_produto(a,u,q,1); raise exception 'FAIL historical draft'; exception when raise_exception then if sqlerrm not like '%possui histórico%' then raise;end if;end;
 if has_function_privilege('authenticated','public.gestao_excluir_produto(uuid,uuid,uuid,integer)','execute') or has_function_privilege('anon','public.gestao_excluir_produto(uuid,uuid,uuid,integer)','execute') then raise exception 'FAIL exposed RPC';end if;
end $$;
select 'PASS: deletion, audit, positive/negative/zero stock, ledger, draft/history, inactivation, scope, role, version, RPC grants' result;
rollback;

