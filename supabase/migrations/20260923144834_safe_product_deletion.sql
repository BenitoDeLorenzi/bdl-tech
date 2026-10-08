create function public.gestao_excluir_produto(p_ator uuid,p_unidade uuid,p_produto uuid,p_versao integer)
returns void language plpgsql security invoker set search_path='' as $$
declare e uuid; p public.gestao_produtos%rowtype; item jsonb;
begin
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then
   raise exception 'Esta ação exige acesso de gestor à empresa com licença vigente.';
 end if;
 -- Serializes deletion with inventory writes and the FOR SHARE used by closing drafts.
 select * into p from public.gestao_produtos where id=p_produto and unidade_id=p_unidade for update;
 if not found then raise exception 'Produto não encontrado nesta unidade.'; end if;
 if p.versao is distinct from p_versao then raise exception 'Outro usuário alterou o produto. Atualize a página.'; end if;
 if p.saldo<>0 then raise exception 'Não é possível excluir um produto com saldo em estoque. Inative o produto para preservar o histórico.'; end if;
 item:=jsonb_build_array(jsonb_build_object('produto_id',p_produto));
 if exists(select 1 from public.gestao_movimentos where produto_id=p_produto)
 or exists(select 1 from public.gestao_fechamentos where unidade_id=p_unidade and itens @> item)
 or exists(select 1 from public.gestao_auditoria where empresa_id=e and
   (dados->'solicitacao'->'itens' @> item or dados->'anterior'->'itens' @> item)) then
   raise exception 'Este produto possui histórico de movimentações ou fechamentos e não pode ser excluído. Inative o produto para preservar o histórico.';
 end if;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(e,p_ator,'excluir_produto',p_produto,jsonb_build_object('anterior',to_jsonb(p)));
 delete from public.gestao_produtos where id=p_produto;
end $$;
revoke all on function public.gestao_excluir_produto(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.gestao_excluir_produto(uuid,uuid,uuid,integer) to service_role;
