# Vibe Frotas para empresas e órgãos públicos

Os veículos pertencem diretamente à empresa. O cadastro, as operações, a navegação e as permissões do aplicativo não usam mais secretarias. O endereço antigo `/frotas/secretarias` redireciona para os veículos.

## Compatibilidade dos dados

- `prefeitura_id` continua sendo o identificador interno da empresa, sem alterar os vínculos, as licenças ou as regras de acesso existentes.
- O slug `frotas-publicas` permanece por compatibilidade.
- A coluna opcional `frota_veiculos.secretaria` e os filtros antigos dos relatórios são preservados. A geração de novos relatórios não aceita esse filtro; a leitura de relatórios históricos ainda o respeita para não ampliar os resultados salvos.
- A tabela antiga de secretarias e suas permissões permanecem no banco para preservar os dados, mas não têm cadastro, ações ou concessão de permissões na interface atual.
- A migração existente `20260901083228_align_frota_veiculos_plexi_registration.sql` já torna secretaria opcional. Nenhuma migração adicional ou exclusão de dados é necessária para esta mudança.

Os nomes reais das empresas, inclusive os de prefeituras, continuam sendo exibidos como cadastrados.
