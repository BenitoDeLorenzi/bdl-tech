create function public.gestao_excluir_fechamento(p_ator uuid,p_unidade uuid,p_fechamento uuid,p_versao integer)
returns void language plpgsql security invoker set search_path='' as $$
declare e uuid; f public.gestao_fechamentos%rowtype;
begin
 if not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then
   raise exception 'Somente o usuário Master pode excluir fechamentos.';
 end if;
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then
   raise exception 'Empresa ou módulo sem acesso vigente.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_fechamento::text,0));
 select * into f from public.gestao_fechamentos where id=p_fechamento and unidade_id=p_unidade for update;
 if not found then raise exception 'Fechamento não encontrado nesta unidade.'; end if;
 if f.versao is distinct from p_versao then raise exception 'O fechamento foi alterado. Atualize antes de excluir.'; end if;
 -- Reuse transactional reversal, including ordered employee/product locks and dependency checks.
 if f.status='conferido' then
   perform public.gestao_operar(p_ator,'reabrir',jsonb_build_object('id',p_fechamento,'unidade_id',p_unidade,'versao',p_versao,'motivo','Exclusão definitiva pelo Master'));
 end if;
 -- Refuse inconsistent historic data instead of silently corrupting balances.
 if exists(select 1 from public.gestao_equipe_extrato where fechamento_id=p_fechamento and not estornado)
 or exists(select 1 from public.gestao_movimentos where fechamento_id=p_fechamento group by produto_id having sum(quantidade)<>0) then
   raise exception 'Os vínculos deste fechamento precisam ser revisados antes da exclusão.';
 end if;
 -- This existing tombstone also prevents stale clients from recreating the deleted UUID.
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(e,p_ator,'excluir_rascunho',p_fechamento,jsonb_build_object('anterior',to_jsonb(f),'exclusao_definitiva',true));
 delete from public.gestao_equipe_extrato where fechamento_id=p_fechamento;
 delete from public.gestao_movimentos where fechamento_id=p_fechamento;
 delete from public.gestao_fechamentos where id=p_fechamento;
end $$;
revoke all on function public.gestao_excluir_fechamento(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.gestao_excluir_fechamento(uuid,uuid,uuid,integer) to service_role;

-- Close the previous draft-only entry point for non-Master callers as well.
create or replace function public.gestao_excluir_rascunho(p_ator uuid,p_unidade uuid,p_fechamento uuid,p_versao integer)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.gestao_excluir_fechamento(p_ator,p_unidade,p_fechamento,p_versao);
end $$;
revoke all on function public.gestao_excluir_rascunho(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.gestao_excluir_rascunho(uuid,uuid,uuid,integer) to service_role;
