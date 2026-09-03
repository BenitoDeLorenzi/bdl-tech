update public.permissoes
set nome = 'Gerenciar débitos',
    descricao = 'Permite registrar e controlar débitos e pagamentos dos veículos.'
where chave = 'expirations.manage';

update public.permissoes
set nome = 'Visualizar débitos',
    descricao = 'Permite consultar débitos dos veículos.'
where chave = 'expirations.read';
