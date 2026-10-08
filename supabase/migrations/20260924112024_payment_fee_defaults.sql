create table public.gestao_taxas_recebimento (
 unidade_id uuid not null references public.gestao_unidades(id) on delete cascade,
 forma text not null check(forma in ('Dinheiro','Pix','Débito','Crédito')),
 percentual numeric(5,2) not null check(percentual>=0 and percentual<=100),
 versao integer not null default 1,
 primary key(unidade_id,forma)
);
alter table public.gestao_taxas_recebimento enable row level security;
create policy taxas_leitura on public.gestao_taxas_recebimento for select to authenticated
 using(unidade_id in(select id from public.gestao_unidades));
grant select on public.gestao_taxas_recebimento to authenticated;
grant all on public.gestao_taxas_recebimento to service_role;

create function public.gestao_salvar_taxa(p_ator uuid,p_unidade uuid,p_forma text,p_percentual numeric,p_versao integer)
returns void language plpgsql security invoker set search_path='' as $$
declare e uuid; atual integer;
begin
 select empresa_id into e from public.gestao_unidades where id=p_unidade;
 if e is null or gestao_private.papel_gestao(p_ator,e) is distinct from 'gestor' then raise exception 'Somente um gestor com acesso vigente pode configurar as taxas.';end if;
 if p_forma is null or p_forma not in ('Dinheiro','Pix','Débito','Crédito') then raise exception 'Forma de pagamento inválida.';end if;
 if p_percentual is null or p_percentual::text in ('NaN','Infinity','-Infinity') or p_percentual<0 or p_percentual>100 or p_percentual<>round(p_percentual,2) then raise exception 'Informe uma taxa entre 0 e 100, com até duas casas decimais.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_unidade::text||':taxa:'||p_forma,0));
 select versao into atual from public.gestao_taxas_recebimento where unidade_id=p_unidade and forma=p_forma for update;
 if coalesce(atual,0) is distinct from p_versao then raise exception 'A taxa foi alterada. Atualize a página antes de salvar.';end if;
 insert into public.gestao_taxas_recebimento(unidade_id,forma,percentual) values(p_unidade,p_forma,p_percentual)
 on conflict(unidade_id,forma) do update set percentual=excluded.percentual,versao=gestao_taxas_recebimento.versao+1;
 insert into public.gestao_auditoria(empresa_id,usuario_id,acao,registro_id,dados)
 values(e,p_ator,'taxa_recebimento',p_unidade,jsonb_build_object('forma',p_forma,'percentual',p_percentual));
end $$;
revoke all on function public.gestao_salvar_taxa(uuid,uuid,text,numeric,integer) from public,anon,authenticated;
grant execute on function public.gestao_salvar_taxa(uuid,uuid,text,numeric,integer) to service_role;
