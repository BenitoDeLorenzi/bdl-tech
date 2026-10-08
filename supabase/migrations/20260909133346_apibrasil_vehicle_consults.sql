create index if not exists frota_apibrasil_lookup_idx
on public.frota_debito_consultas (prefeitura_id, license_plate, (request_payload->>'tipo'), created_at desc)
where provider = 'apibrasil';

-- Server-only RPCs. Authorization and tenant checks happen before the service-role call.
create or replace function public.reserve_apibrasil_consult(
  p_prefeitura uuid, p_plate text, p_renavam text, p_vehicle uuid, p_tipo text, p_price numeric
) returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare c public.frota_debito_consultas;
begin
  if p_tipo not in ('veiculos-dados-v1', 'debitos-v4') or p_plate !~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$' then
    raise exception 'Invalid consultation';
  end if;
  if p_vehicle is not null and not exists (select 1 from public.frota_veiculos where id=p_vehicle and prefeitura_id=p_prefeitura and placa=p_plate) then
    raise exception 'Vehicle does not belong to tenant';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_prefeitura::text || p_plate || p_tipo, 0));
  select * into c from public.frota_debito_consultas
    where provider='apibrasil' and prefeitura_id=p_prefeitura and license_plate=p_plate
      and request_payload->>'tipo'=p_tipo and created_at > now()-interval '24 hours'
    order by created_at desc limit 1;
  if found then return jsonb_build_object('id',c.id,'fresh',false); end if;
  insert into public.frota_debito_consultas(prefeitura_id,veiculo_id,provider,client_request_id,license_plate,renavam,request_payload)
    values(p_prefeitura,p_vehicle,'apibrasil',gen_random_uuid()::text,p_plate,p_renavam,
      jsonb_build_object('tipo',p_tipo,'homolog',false,'estimated_price',p_price)) returning * into c;
  return jsonb_build_object('id',c.id,'fresh',true);
end $$;

create or replace function public.persist_apibrasil_consult(
  p_consulta uuid, p_vehicle_data jsonb, p_debts jsonb, p_fines jsonb
) returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare c public.frota_debito_consultas; v public.frota_veiculos; d jsonb; tipo text;
begin
  select * into strict c from public.frota_debito_consultas where id=p_consulta and provider='apibrasil' for update;
  if c.status='success' then return c.veiculo_id; end if;
  if c.response_payload->>'homolog' is distinct from 'false' or c.response_payload->>'error' is distinct from 'false' then
    raise exception 'Production result required';
  end if;
  tipo := c.request_payload->>'tipo';
  if c.veiculo_id is null and tipo='veiculos-dados-v1' then
    insert into public.frota_veiculos(prefeitura_id,placa,renavam,marca,modelo,tipo,ano,status)
      values(c.prefeitura_id,c.license_plate,c.renavam,'Nao informado','Nao informado','Nao informado',0,'active')
      on conflict(prefeitura_id,placa) do nothing;
    select * into strict v from public.frota_veiculos where prefeitura_id=c.prefeitura_id and placa=c.license_plate for update;
    c.veiculo_id := v.id;
  else
    select * into strict v from public.frota_veiculos where id=c.veiculo_id and prefeitura_id=c.prefeitura_id and placa=c.license_plate for update;
  end if;
  if tipo='veiculos-dados-v1' then
    if p_vehicle_data->>'placa' is distinct from c.license_plate then raise exception 'Plate mismatch'; end if;
    update public.frota_veiculos set
      marca=coalesce(nullif(p_vehicle_data->>'marca',''),marca),
      modelo=coalesce(nullif(p_vehicle_data->>'modelo',''),modelo),
      tipo=coalesce(nullif(p_vehicle_data->>'tipo',''),tipo),
      renavam=coalesce(nullif(p_vehicle_data->>'renavam',''),renavam),
      lugares=coalesce(p_vehicle_data->>'lugares',lugares),
      combustivel=coalesce(p_vehicle_data->>'combustivel',combustivel),
      cor=coalesce(p_vehicle_data->>'cor',cor),
      especie=coalesce(p_vehicle_data->>'especie',especie),
      carroceria=coalesce(p_vehicle_data->>'carroceria',carroceria),
      categoria=coalesce(p_vehicle_data->>'categoria',categoria),
      municipio_emplacamento=coalesce(p_vehicle_data->>'municipio_emplacamento',municipio_emplacamento),
      situacao_veicular=coalesce(p_vehicle_data->>'situacao_veicular',situacao_veicular),
      ano_fabricacao=coalesce((p_vehicle_data->>'ano_fabricacao')::integer,ano_fabricacao),
      ano_modelo=coalesce((p_vehicle_data->>'ano_modelo')::integer,ano_modelo),
      ano=coalesce((p_vehicle_data->>'ano_modelo')::integer,(p_vehicle_data->>'ano_fabricacao')::integer,ano),
      origem_dados='APIBrasil'
    where id=c.veiculo_id;
  elsif tipo='debitos-v4' then
    -- Replace only this provider's current snapshot; preserve manual and other-provider rows.
    delete from public.frota_multas_veiculares m using public.frota_debito_consultas old
      where m.consulta_id=old.id and old.provider='apibrasil' and m.veiculo_id=c.veiculo_id;
    for d in select value from jsonb_array_elements(p_debts) loop
      insert into public.frota_debitos_veiculares(consulta_id,prefeitura_id,veiculo_id,provider,provider_debit_id,type,title,description,amount,due_date,expiration_date,is_expired,raw_payload)
      values(c.id,c.prefeitura_id,c.veiculo_id,'apibrasil',d->>'provider_debit_id',d->>'type',d->>'title',d->>'description',
        (d->>'amount')::numeric,(d->>'due_date')::timestamptz,(d->>'due_date')::timestamptz,
        coalesce((d->>'due_date')::date < current_date,false),d->'raw_payload')
      on conflict(consulta_id,provider_debit_id) do nothing;
    end loop;
    for d in select value from jsonb_array_elements(p_fines) loop
      insert into public.frota_multas_veiculares(consulta_id,prefeitura_id,veiculo_id,origem,numero_auto,situacao,descricao,data_infracao,hora,local_complemento,valor,raw_payload)
      values(c.id,c.prefeitura_id,c.veiculo_id,'pagar',d->>'numero_auto',d->>'situacao',d->>'descricao',
        (d->>'data_infracao')::date,d->>'hora',d->>'local_complemento',(d->>'valor')::numeric,d->'raw_payload');
    end loop;
  else raise exception 'Invalid consultation type';
  end if;
  update public.frota_debito_consultas set status='success',veiculo_id=c.veiculo_id,error_message=null,updated_at=now() where id=c.id;
  return c.veiculo_id;
end $$;

revoke all on function public.reserve_apibrasil_consult(uuid,text,text,uuid,text,numeric) from public,anon,authenticated;
revoke all on function public.persist_apibrasil_consult(uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_apibrasil_consult(uuid,text,text,uuid,text,numeric) to service_role;
grant execute on function public.persist_apibrasil_consult(uuid,jsonb,jsonb,jsonb) to service_role;
