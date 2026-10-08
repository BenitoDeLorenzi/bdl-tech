# Sidebars do Vibe Tech

Padrão aprovado para o painel administrativo, Vibe Frotas, Vibe Gestão e módulos futuros.

## Composição

1. `Sidebar` com `collapsible="icon"` e `variant="inset"`.
2. `SidebarHeader` com `SidebarIdentity`: título discreto do módulo, logo/nome da empresa e descrição opcional. O painel administrativo usa a identidade Vibe Tech.
3. Grupos de navegação com `SidebarMenuButton`, `isActive`, tooltip e `sidebarNavClass`.
4. `SidebarFooter className={sidebarFooterClass}` contendo `SidebarUserMenu emphasized`.

Componentes compartilhados:
- `src/components/sidebar-identity.tsx`
- `src/components/sidebar-styles.ts`
- `src/components/sidebar-user-menu.tsx`

O cabeçalho segue o [Sidebar original do shadcn](https://ui.shadcn.com/blocks/sidebar#sidebar-08): título discreto do módulo (12px) acima da identificação da empresa, avatar de 32px e nome fantasia. Usar o nome oficial como fallback. Sem cartão ou borda adicional; nomes longos ficam truncados com tooltip. Descrições devem acrescentar informação, como a unidade.

Para Master, `SidebarIdentity` recebe `options`, `selectedId` e `onSelect`: toda a linha abre um `DropdownMenu` com as empresas autorizadas. Para outros perfis, renderiza uma identificação estática com a mesma composição, sem botão, chevrons ou dropdown. A aplicação valida o acesso no servidor e carrega somente empresas licenciadas para o módulo.
## Verificação ao integrar um módulo

Verificar logo e fallback de iniciais, nome longo, rota ativa, submenu, menu do usuário, modo recolhido, tela móvel e tema escuro. Confirmar que outros perfis não veem nem conseguem usar a troca de empresa. Usar o atributo `data-active` dos componentes Base UI atuais.

O portal utiliza HeaderUserMenu do mesmo componente compartilhado. Todos os usuários têm Meu perfil (modal), Portal de módulos e Sair; somente Master tem Painel Vibe Tech. Foto e dados do perfil são compartilhados entre módulos. Não criar menus de conta independentes.
