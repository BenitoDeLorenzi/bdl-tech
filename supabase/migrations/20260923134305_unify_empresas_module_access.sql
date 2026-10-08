
-- Preserve tenant IDs and all existing foreign keys. Legacy column names remain
-- compatible with Frotas; the canonical company registry is now empresas.
alter table public.prefeituras rename to empresas;
alter table public.empresas alter column cnpj drop not null;
insert into public.empresas(id,nome,status,created_at)
 select id,nome,case when ativo then 'active'::public.subscription_status else 'suspended'::public.subscription_status end,created_at
 from public.gestao_empresas;

alter table public.gestao_membros drop constraint gestao_membros_empresa_id_fkey;
alter table public.gestao_unidades drop constraint gestao_unidades_empresa_id_fkey;
alter table public.gestao_auditoria drop constraint gestao_auditoria_empresa_id_fkey;
alter table public.gestao_membros add constraint gestao_membros_empresa_id_fkey foreign key(empresa_id) references public.empresas(id);
alter table public.gestao_unidades add constraint gestao_unidades_empresa_id_fkey foreign key(empresa_id) references public.empresas(id);
alter table public.gestao_auditoria add constraint gestao_auditoria_empresa_id_fkey foreign key(empresa_id) references public.empresas(id);

-- Internal helper; caller supplies a trusted identity only through service-only RPC.
create function gestao_private.papel_gestao(p_usuario uuid,p_empresa uuid)
returns text language sql stable security definer set search_path='' as $$
 select case when p.role::text in ('bdl_admin','municipal_admin') or exists(
 select 1 from public.usuario_permissoes up join public.permissoes pe on pe.id=up.permissao_id
 where up.usuario_id=p.id and pe.modulo_id=m.id and pe.chave='gestao.manage') then 'gestor' else 'operador' end
 from public.perfis p
 join public.empresas e on e.id=p_empresa and e.status='active'
 join public.licencas l on l.prefeitura_id=e.id and l.status='active'
 join public.modulos m on m.id=l.modulo_id and m.ativo and m.slug='gestao-estabelecimentos'
 where p.id=p_usuario and p.ativo
 and l.inicio <= (now() at time zone 'America/Sao_Paulo')::date
 and l.fim >= (now() at time zone 'America/Sao_Paulo')::date
 and (p.role::text='bdl_admin' or (p.prefeitura_id=e.id and (
 p.role::text='municipal_admin' or exists(select 1 from public.usuario_modulos um
 where um.usuario_id=p.id and um.prefeitura_id=e.id and um.modulo_id=m.id))))
 limit 1
$$;
revoke all on function gestao_private.papel_gestao(uuid,uuid) from public,anon,authenticated;
grant usage on schema gestao_private to service_role;
grant execute on function gestao_private.papel_gestao(uuid,uuid) to service_role;

create or replace function gestao_private.empresas_acessiveis() returns setof uuid
language sql stable security definer set search_path='' as $$
 select e.id from public.empresas e where gestao_private.papel_gestao(auth.uid(),e.id) is not null
$$;

-- Read-only projection, not a second company registry.
drop table public.gestao_empresas;
create view public.gestao_empresas with(security_invoker=true) as
 select id,nome,status='active' as ativo,created_at from public.empresas
 where id in (select gestao_private.empresas_acessiveis());
create function gestao_private.empresas_do_usuario() returns setof uuid
language sql stable security definer set search_path='' as $$
 select e.id from public.empresas e join public.perfis p on p.id=auth.uid() and p.ativo
 where p.role::text='bdl_admin' or p.prefeitura_id=e.id
$$;
revoke all on function gestao_private.empresas_do_usuario() from public,anon;
grant execute on function gestao_private.empresas_do_usuario() to authenticated,service_role;
grant execute on function gestao_private.empresas_acessiveis() to service_role;
create policy empresas_leitura on public.empresas for select to authenticated
 using(id in(select gestao_private.empresas_do_usuario()));
revoke all on public.empresas from anon,authenticated;
grant select on public.empresas,public.gestao_empresas to authenticated;
grant all on public.empresas to service_role;
grant select on public.gestao_empresas to service_role;
-- Old integrations can read the same registry during transition.
create view public.prefeituras with(security_invoker=true) as select * from public.empresas;
revoke all on public.prefeituras from anon,authenticated;
grant select on public.prefeituras to authenticated;
grant all on public.prefeituras to service_role;

insert into public.permissoes(modulo_id,chave,nome,descricao)
 select id,'gestao.manage','Administrar estabelecimento','Cadastrar produtos, movimentar estoque, conferir e reabrir fechamentos.'
 from public.modulos where slug='gestao-estabelecimentos' on conflict(modulo_id,chave) do nothing;

-- Licensing provisions the first unit; suspension never removes operational data.
create function gestao_private.provisionar_unidade() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.status='active' and exists(select 1 from public.modulos where id=new.modulo_id and slug='gestao-estabelecimentos') then
   perform 1 from public.empresas where id=new.prefeitura_id for update;
   if not exists(select 1 from public.gestao_unidades where empresa_id=new.prefeitura_id) then
     insert into public.gestao_unidades(empresa_id,nome) values(new.prefeitura_id,'Principal');
   end if;
 end if;
 return new;
end $$;
revoke all on function gestao_private.provisionar_unidade() from public,anon,authenticated;
create trigger gestao_licenca_unidade after insert or update on public.licencas
 for each row execute function gestao_private.provisionar_unidade();
insert into public.gestao_unidades(empresa_id,nome)
 select distinct l.prefeitura_id,'Principal' from public.licencas l join public.modulos m on m.id=l.modulo_id
 where m.slug='gestao-estabelecimentos' and l.status='active'
 and not exists(select 1 from public.gestao_unidades u where u.empresa_id=l.prefeitura_id);

-- Clear old entitlements whenever a profile changes company or role, atomically.
create function gestao_private.limpar_acessos_transferencia() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.prefeitura_id is distinct from old.prefeitura_id or new.role is distinct from old.role then
   delete from public.usuario_permissoes where usuario_id=new.id;
   delete from public.usuario_modulos where usuario_id=new.id;
   delete from public.gestao_membros where usuario_id=new.id;
 end if;
 return new;
end $$;
revoke all on function gestao_private.limpar_acessos_transferencia() from public,anon,authenticated;
create trigger perfis_empresa_acessos after update on public.perfis for each row
 execute function gestao_private.limpar_acessos_transferencia();

create function public.atualizar_usuario_acessos(p_ator uuid,p_usuario uuid,p_empresa uuid,p_modulos uuid[],p_permissoes uuid[])
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.perfis where id=p_ator and ativo and role::text='bdl_admin') then
   raise exception 'Acesso não autorizado.';
 end if;
 perform 1 from public.perfis where id=p_usuario and prefeitura_id=p_empresa and role::text='municipal_user' for update;
 if not found then raise exception 'Usuário não pertence à empresa ou tem acesso integral pelo perfil.'; end if;
 if exists(select 1 from unnest(p_modulos) x(id) where not exists(
   select 1 from public.licencas l join public.modulos m on m.id=l.modulo_id
   join public.empresas e on e.id=l.prefeitura_id
   where l.prefeitura_id=p_empresa and l.modulo_id=x.id and l.status='active' and m.ativo and e.status='active'
   and l.inicio <= (now() at time zone 'America/Sao_Paulo')::date and l.fim >= (now() at time zone 'America/Sao_Paulo')::date
 )) then raise exception 'Selecione somente módulos com licença vigente da empresa.'; end if;
 if exists(select 1 from unnest(p_permissoes) x(id) where not exists(
 select 1 from public.permissoes pe where pe.id=x.id and pe.modulo_id=any(p_modulos)
 )) then raise exception 'Permissão inválida para os módulos selecionados.'; end if;
 delete from public.usuario_permissoes where usuario_id=p_usuario;
 delete from public.usuario_modulos where usuario_id=p_usuario;
 insert into public.usuario_modulos(usuario_id,prefeitura_id,modulo_id)
 select p_usuario,p_empresa,id from (select distinct unnest(p_modulos) id) x;
 insert into public.usuario_permissoes(usuario_id,permissao_id)
 select p_usuario,id from (select distinct unnest(p_permissoes) id) x;
end $$;
revoke all on function public.atualizar_usuario_acessos(uuid,uuid,uuid,uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.atualizar_usuario_acessos(uuid,uuid,uuid,uuid[],uuid[]) to service_role;

create or replace function public.gestao_operar(p_ator uuid,p_acao text,p_dados jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
 v_admin boolean; v_gestor boolean; v_empresa uuid; v_unidade uuid; v_id uuid;
 v_f public.gestao_fechamentos%rowtype; v_p public.gestao_produtos%rowtype;
 v_item jsonb; v_pag jsonb; v_itens jsonb := '[]'; v_q numeric; v_valor numeric;
 v_total numeric := 0; v_recebido numeric := 0; v_nome text;
begin
 select p.role::text='bdl_admin' into v_admin from public.perfis p where p.id=p_ator and p.ativo;
 if not found then raise exception 'Acesso não autorizado.'; end if;
 if p_acao in ('empresa','membro') then raise exception 'Gerencie empresas e usuários no painel administrativo.'; end if;
 v_unidade := (p_dados->>'unidade_id')::uuid;
 select u.empresa_id into v_empresa from public.gestao_unidades u join public.empresas e on e.id=u.empresa_id and e.status='active' where u.id=v_unidade;
 if not found then raise exception 'Unidade indisponível.'; end if;
 if gestao_private.papel_gestao(p_ator,v_empresa) is null then raise exception 'Empresa ou módulo sem acesso vigente.'; end if;
 v_gestor := gestao_private.papel_gestao(p_ator,v_empresa)='gestor';
 if p_acao not in ('salvar') and not v_gestor then raise exception 'Esta ação exige acesso de gestor.'; end if;
 if p_acao='produto' then
   insert into public.gestao_produtos(empresa_id,unidade_id,nome,categoria,unidade,preco,minimo)
   values(v_empresa,v_unidade,trim(p_dados->>'nome'),trim(p_dados->>'categoria'),p_dados->>'unidade',
   (p_dados->>'preco')::numeric,(p_dados->>'minimo')::numeric) returning id into v_id;
 elsif p_acao='movimento' then
   v_id := (p_dados->>'produto_id')::uuid;
   select * into v_p from public.gestao_produtos where id=v_id and unidade_id=v_unidade for update;
   if not found then raise exception 'Produto não encontrado nesta unidade.'; end if;
   v_q := (p_dados->>'quantidade')::numeric;
   if v_q is null or v_q=0 or v_q::text in ('NaN','Infinity','-Infinity') or v_q<>round(v_q,3) then raise exception 'Quantidade inválida.'; end if;
   if p_dados->>'tipo' not in ('entrada','perda','consumo','ajuste') then raise exception 'Tipo de movimento inválido.'; end if;
   if p_dados->>'tipo'='entrada' and v_q<0 then raise exception 'A entrada deve ser positiva.'; end if;
   if p_dados->>'tipo' in ('perda','consumo') and v_q>0 then v_q := -v_q; end if;
   insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,criado_por)
   values(v_empresa,v_unidade,v_id,v_q,p_dados->>'tipo',trim(p_dados->>'motivo'),p_ator);
   update public.gestao_produtos set saldo=saldo+v_q where id=v_id;
 elsif p_acao='salvar' then
   v_id := (p_dados->>'id')::uuid;
   -- Serialize concurrent creates/updates of this client-generated identity.
   perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
   select * into v_f from public.gestao_fechamentos where id=v_id for update;
   if found then
     if v_f.unidade_id<>v_unidade then raise exception 'Fechamento de outra unidade.'; end if;
     if v_f.status<>'rascunho' then raise exception 'Fechamento já conferido. Reabra com justificativa para corrigir.'; end if;
     if v_f.versao is distinct from (p_dados->>'versao')::integer then raise exception 'Outro usuário alterou este fechamento. Atualize a página antes de editar.'; end if;
   end if;
   if jsonb_typeof(p_dados->'itens') is distinct from 'array' or jsonb_array_length(p_dados->'itens') not between 1 and 500
   then raise exception 'Informe de 1 a 500 produtos.'; end if;
   if (select count(*)<>count(distinct value->>'produto_id') from jsonb_array_elements(p_dados->'itens')) then raise exception 'Há produtos repetidos.'; end if;
   for v_item in select value from jsonb_array_elements(p_dados->'itens') loop
     select * into v_p from public.gestao_produtos where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade and ativo;
     if not found then raise exception 'Produto inválido ou de outra unidade.'; end if;
     v_q := (v_item->>'quantidade')::numeric; v_valor := (v_item->>'total')::numeric;
     if v_q is null or v_q<=0 or v_q>999999999 or v_q<>round(v_q,3)
        or v_valor is null or v_valor<0 or v_valor>999999999 or v_valor<>round(v_valor,2)
        or v_q::text in ('NaN','Infinity','-Infinity') or v_valor::text in ('NaN','Infinity','-Infinity')
     then raise exception 'Quantidade ou valor inválido.'; end if;
     v_itens := v_itens || jsonb_build_array(jsonb_build_object('produto_id',v_p.id,'nome',v_p.nome,'quantidade',v_q,'total',v_valor));
     v_total := v_total+v_valor;
   end loop;
   if jsonb_typeof(p_dados->'pagamentos') is distinct from 'array' or jsonb_array_length(p_dados->'pagamentos')>100 then raise exception 'Pagamentos inválidos.'; end if;
   for v_pag in select value from jsonb_array_elements(p_dados->'pagamentos') loop
     v_valor := (v_pag->>'valor')::numeric;
     if v_valor is null or v_valor<=0 or v_valor>999999999 or v_valor<>round(v_valor,2) or v_valor::text in ('NaN','Infinity','-Infinity')
     or coalesce(v_pag->>'forma','') not in ('Dinheiro','Pix','Débito','Crédito','Outros')
     or length(trim(coalesce(v_pag->>'origem',''))) not between 1 and 120 then raise exception 'Informe forma, origem e valor válido para cada recebimento.'; end if;
   end loop;
   insert into public.gestao_fechamentos(id,empresa_id,unidade_id,data,turno,origem,itens,pagamentos,observacoes,total,criado_por)
   values(v_id,v_empresa,v_unidade,(p_dados->>'data')::date,lower(trim(p_dados->>'turno')),lower(trim(p_dados->>'origem')),
    v_itens,p_dados->'pagamentos',coalesce(p_dados->>'observacoes',''),v_total,p_ator)
   on conflict(id) do update set data=excluded.data,turno=excluded.turno,origem=excluded.origem,itens=excluded.itens,
    pagamentos=excluded.pagamentos,observacoes=excluded.observacoes,total=excluded.total,versao=public.gestao_fechamentos.versao+1;
 elsif p_acao in ('confirmar','reabrir') then
   v_id := (p_dados->>'id')::uuid;
   select * into v_f from public.gestao_fechamentos where id=v_id and unidade_id=v_unidade for update;
   if not found then raise exception 'Fechamento não encontrado.'; end if;
   if p_acao='confirmar' and v_f.status='conferido' then return v_id; end if;
   if p_acao='reabrir' and v_f.status='rascunho' then return v_id; end if;
   if v_f.versao is distinct from (p_dados->>'versao')::integer then raise exception 'O fechamento foi alterado. Atualize antes de continuar.'; end if;
   if p_acao='confirmar' then
     select coalesce(sum((value->>'valor')::numeric),0) into v_recebido from jsonb_array_elements(v_f.pagamentos);
     if v_recebido<>v_f.total then raise exception 'Os recebimentos não conferem com o total dos produtos.'; end if;
   elsif length(trim(coalesce(p_dados->>'motivo','')))<5 then raise exception 'Justifique a reabertura com pelo menos 5 caracteres.';
   end if;
   -- Deterministic row lock ordering prevents deadlocks across simultaneous closings.
   for v_item in select value from jsonb_array_elements(v_f.itens) order by value->>'produto_id' loop
     v_q := (v_item->>'quantidade')::numeric * case when p_acao='confirmar' then -1 else 1 end;
     update public.gestao_produtos set saldo=saldo+v_q where id=(v_item->>'produto_id')::uuid and unidade_id=v_unidade;
     if not found then raise exception 'Produto indisponível.'; end if;
     insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,fechamento_id,criado_por)
     values(v_empresa,v_unidade,(v_item->>'produto_id')::uuid,v_q,
       case when p_acao='confirmar' then 'venda' else 'estorno' end,
       case when p_acao='confirmar' then 'Fechamento confirmado' else trim(p_dados->>'motivo') end,v_id,p_ator);
   end loop;
   update public.gestao_fechamentos set status=case when p_acao='confirmar' then 'conferido' else 'rascunho' end,
   confirmado_por=case when p_acao='confirmar' then p_ator end,
   confirmado_em=case when p_acao='confirmar' then now() end,versao=versao+1 where id=v_id;
 else raise exception 'Operação desconhecida.';
 end if;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(v_empresa,p_ator,p_acao,v_id,jsonb_build_object('anterior',case when v_f.id is not null then to_jsonb(v_f) else null end,'solicitacao',p_dados));
 return v_id;
end $$;
