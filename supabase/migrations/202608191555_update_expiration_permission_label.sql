update public.permissoes
set nome = 'Gerenciamento de vencimentos (Seguro, IPVA)',
    descricao = 'Permite gerenciar vencimentos de seguro e IPVA.'
where chave = 'expirations.manage'
  and modulo_id in (
    select id from public.modulos where slug = 'frotas-publicas'
  );
