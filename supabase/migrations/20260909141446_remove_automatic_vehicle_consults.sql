-- Keep existing vehicle records and consultation history.
drop function if exists public.reserve_apibrasil_consult(uuid, text, text, uuid, text, numeric);
drop function if exists public.persist_apibrasil_consult(uuid, jsonb, jsonb, jsonb);
drop index if exists public.frota_apibrasil_lookup_idx;
