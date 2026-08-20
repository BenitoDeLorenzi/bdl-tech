update public.prefeituras
set status = 'active'
where status = 'implementation';

alter table public.prefeituras
alter column status set default 'active';
