import type { CurrentUserProfile } from "@/lib/auth-data";
import { getUserModules } from "@/lib/empresa-access";
export type PortalModulo = {
  description: string;
  href: string;
  id: string;
  label: string;
  slug: string;
  tag: string;
};
type ModuloRow = { id: string; nome: string; slug: string };
export async function getPortalModules(
  profile: CurrentUserProfile,
): Promise<PortalModulo[]> {
  const modules = (await getUserModules(profile)).map(mapModuloToPortalItem);
  return profile.role === "bdl_admin"
    ? [
        {
          description: "Gestão da Vibe Tech, empresas, licenças e usuários.",
          href: "/",
          id: "bdl-admin",
          label: "Painel Vibe Tech",
          slug: "bdl-admin",
          tag: "Administração",
        },
        ...modules,
      ]
    : modules;
}
function mapModuloToPortalItem(modulo: ModuloRow): PortalModulo {
  if (modulo.slug === "gestao-estabelecimentos") {
    return {
      description:
        "Fechamentos por produto, estoque e gestão do estabelecimento.",
      href: "/gestao",
      id: modulo.id,
      label: modulo.nome,
      slug: modulo.slug,
      tag: "Estabelecimentos",
    };
  }
  if (modulo.slug === "frotas-publicas") {
    return {
      description: "Operação da frota, veículos, manutenção e abastecimento.",
      href: "/frotas",
      id: modulo.id,
      label: modulo.nome,
      slug: modulo.slug,
      tag: "Módulo municipal",
    };
  }

  return {
    description: "Módulo habilitado para acesso.",
    href: "#",
    id: modulo.id,
    label: modulo.nome,
    slug: modulo.slug,
    tag: "Em breve",
  };
}
