-- Transactional integration test: no fixtures or notifications are committed.
begin;
do $$
declare
  vehicle public.frota_veiculos%rowtype;
  actor uuid;
  maintenance uuid := gen_random_uuid();
  usage uuid := gen_random_uuid();
  maintenance_cancel uuid := gen_random_uuid();
  usage_cancel uuid := gen_random_uuid();
  feed jsonb;
  first_id bigint;
begin
  select * into strict vehicle from public.frota_veiculos limit 1;
  select id into strict actor from public.perfis limit 1;
  vehicle.id := gen_random_uuid();
  vehicle.placa := 'TEST-' || vehicle.id::text;
  insert into public.frota_veiculos select vehicle.*;
  select coalesce(max(id),0) into first_id from public.frota_notificacoes;

  insert into public.frota_manutencoes(id,prefeitura_id,veiculo_id,tipo,descricao,data_entrada,status,atividade_por,atividade_usuario_id)
  values(maintenance,vehicle.prefeitura_id,vehicle.id,'preventive','Teste transacional',current_date,'open','Autor teste',actor);
  update public.frota_manutencoes set status='completed',atividade_por='Outro autor',atividade_usuario_id=null where id=maintenance;
  update public.frota_manutencoes set status='completed',observacoes='Não duplica' where id=maintenance;
  insert into public.frota_manutencoes(id,prefeitura_id,veiculo_id,tipo,descricao,data_entrada,status,atividade_por,atividade_usuario_id)
  values(maintenance_cancel,vehicle.prefeitura_id,vehicle.id,'preventive','Teste transacional',current_date,'open','Autor teste',actor);
  update public.frota_manutencoes set status='cancelled' where id=maintenance_cancel;

  insert into public.frota_uso_veiculos(id,prefeitura_id,veiculo_id,funcionario_nome,km_saida,status,atividade_por,atividade_usuario_id)
  values(usage,vehicle.prefeitura_id,vehicle.id,'Motorista teste',100,'in_use','Autor teste',actor);
  update public.frota_uso_veiculos set status='returned',km_retorno=110,atividade_por='Outro autor',atividade_usuario_id=null where id=usage;
  update public.frota_uso_veiculos set status='returned',observacoes_retorno='Não duplica' where id=usage;
  insert into public.frota_uso_veiculos(id,prefeitura_id,veiculo_id,funcionario_nome,km_saida,status,atividade_por,atividade_usuario_id)
  values(usage_cancel,vehicle.prefeitura_id,vehicle.id,'Motorista teste',110,'in_use','Autor teste',actor);
  update public.frota_uso_veiculos set status='cancelled' where id=usage_cancel;

  if (select count(*) from public.frota_notificacoes where id>first_id) <> 8 then
    raise exception 'Expected 8 lifecycle events without duplicates';
  end if;
  if (select count(*) from public.frota_notificacoes where id>first_id and evento='issued' and autor_id=actor and responsavel='Autor teste') <> 4 then
    raise exception 'Wrong creator attribution';
  end if;
  if (select count(*) from public.frota_notificacoes where id>first_id and evento='completed' and autor_id is null and responsavel='Outro autor') <> 2 then
    raise exception 'Wrong completion attribution';
  end if;
  feed := public.listar_frota_notificacoes(vehicle.prefeitura_id,actor,null,array['manutencao']);
  if exists(select 1 from jsonb_array_elements(feed->'items') n where n->>'tipo'<>'manutencao') then
    raise exception 'Permission filtering failed';
  end if;
  if exists(select 1 from jsonb_array_elements(feed->'items') n where (n->>'id')::bigint>first_id and (n->>'autor_id')::uuid=actor and n->>'lida'<>'true') then
    raise exception 'Own activities marked unread';
  end if;
  if (public.listar_frota_notificacoes(vehicle.prefeitura_id,actor,null,array[]::text[])->>'unread')::int<>0 then
    raise exception 'Empty permissions exposed unread count';
  end if;
  if jsonb_array_length(public.listar_frota_notificacoes(gen_random_uuid(),actor,null,array['manutencao','uso_veiculo'])->'items')<>0 then
    raise exception 'Company isolation failed';
  end if;
  delete from public.frota_manutencoes where id=maintenance_cancel;
  delete from public.frota_uso_veiculos where id=usage_cancel;
  if (select count(*) from public.frota_notificacoes where id>first_id and manutencao_id is null and uso_id is null)<>4 then
    raise exception 'Deleted record references not cleared';
  end if;
end;
$$;
rollback;
select 'PASS: lifecycle events, deduplication, actors, permissions, own read state, company isolation and deleted references; fixtures rolled back' as result;
