create sequence if not exists public.frota_fuel_order_number_seq;
select setval('public.frota_fuel_order_number_seq', greatest(coalesce((select max(substring(numero_ordem from '^OA-[0-9]{8}-([0-9]+)$')::bigint) from public.frota_abastecimentos),0), (select last_value from public.frota_fuel_order_number_seq),1),true);
revoke all on sequence public.frota_fuel_order_number_seq from public, anon, authenticated;
grant usage, select on sequence public.frota_fuel_order_number_seq to service_role;
create or replace function public.next_fuel_order_number() returns text language sql security invoker set search_path = '' as $$
 select 'OA-' || to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD') || '-' || case when length(n::text) < 4 then lpad(n::text,4,'0') else n::text end from (select nextval('public.frota_fuel_order_number_seq') n) s;
$$;
revoke all on function public.next_fuel_order_number() from public, anon, authenticated;
grant execute on function public.next_fuel_order_number() to service_role;
