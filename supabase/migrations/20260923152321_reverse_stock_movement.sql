alter table public.gestao_movimentos
 add column estorno_de uuid,
 add column estornado_em timestamptz,
 add column estornado_por uuid references public.perfis(id),
 add constraint gestao_movimentos_estorno_unico unique(estorno_de),
 add constraint gestao_movimentos_contexto_unique unique(empresa_id,unidade_id,produto_id,id),
 add constraint gestao_movimentos_estorno_fk foreign key(empresa_id,unidade_id,produto_id,estorno_de)
   references public.gestao_movimentos(empresa_id,unidade_id,produto_id,id),
 add constraint gestao_movimentos_estorno_tipo check(estorno_de is null or (tipo='estorno' and fechamento_id is null and estorno_de<>id)),
 add constraint gestao_movimentos_estorno_marca check((estornado_em is null)=(estornado_por is null));
alter table public.gestao_movimentos drop constraint gestao_movimentos_custo_valido;
alter table public.gestao_movimentos add constraint gestao_movimentos_custo_valido check (
 custo_unitario is null or (
   custo_unitario>=0 and custo_unitario<1000000000 and
   ((tipo='entrada' and quantidade>0) or (tipo='estorno' and estorno_de is not null and quantidade<0))
 )
);
create function public.gestao_estornar_movimento(p_ator uuid,p_unidade uuid,p_movimento uuid,p_motivo text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare e uuid; m public.gestao_movimentos%rowtype; p public.gestao_produtos%rowtype; r uuid;
begin
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then
   raise exception 'Esta ação exige acesso de gestor à empresa com licença vigente.';
 end if;
 if p_motivo is null or length(trim(p_motivo)) not between 3 and 500 then
   raise exception 'Informe uma justificativa entre 3 e 500 caracteres.';
 end if;
 select * into m from public.gestao_movimentos where id=p_movimento and unidade_id=p_unidade for update;
 if not found then raise exception 'Movimentação não encontrada nesta unidade.';end if;
 if m.tipo not in ('entrada','perda','consumo','ajuste') or m.fechamento_id is not null or m.estorno_de is not null then
   raise exception 'Somente movimentações manuais podem ser estornadas aqui. Para vendas, reabra o fechamento correspondente.';
 end if;
 select id into r from public.gestao_movimentos where estorno_de=m.id;
 if r is not null then return r;end if;
 if m.estornado_em is not null then raise exception 'Esta movimentação já foi estornada.';end if;
 select * into p from public.gestao_produtos where id=m.produto_id and unidade_id=p_unidade for update;
 if not found then raise exception 'Produto não encontrado nesta unidade.';end if;
 if m.quantidade>0 and p.saldo-m.quantidade<0 then
   raise exception 'O estorno deixaria o estoque negativo. Confira e regularize as movimentações relacionadas antes de estornar.';
 end if;
 insert into public.gestao_movimentos(empresa_id,unidade_id,produto_id,quantidade,tipo,motivo,criado_por,estorno_de,custo_unitario)
 values(e,p_unidade,m.produto_id,-m.quantidade,'estorno',trim(p_motivo),p_ator,m.id,m.custo_unitario)
 returning id into r;
 update public.gestao_produtos set saldo=saldo-m.quantidade where id=m.produto_id;
 update public.gestao_movimentos set estornado_em=now(),estornado_por=p_ator where id=m.id;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(e,p_ator,'estornar_movimento',r,jsonb_build_object('anterior',to_jsonb(m),'movimento_original',m.id,'motivo',trim(p_motivo),'saldo_anterior',p.saldo,'saldo_atual',p.saldo-m.quantidade));
 return r;
end $$;
revoke all on function public.gestao_estornar_movimento(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.gestao_estornar_movimento(uuid,uuid,uuid,text) to service_role;
