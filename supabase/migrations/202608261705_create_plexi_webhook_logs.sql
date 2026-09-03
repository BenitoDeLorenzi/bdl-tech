create table if not exists public.frota_plexi_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  consulta_id uuid references public.frota_debito_consultas(id) on delete set null,
  status text not null default 'received',
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists frota_plexi_webhook_logs_request_id_idx
on public.frota_plexi_webhook_logs(request_id);

create index if not exists frota_plexi_webhook_logs_created_at_idx
on public.frota_plexi_webhook_logs(created_at desc);
