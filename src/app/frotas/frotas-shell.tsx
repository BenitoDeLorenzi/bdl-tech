import Link from "next/link";
import type { ReactNode } from "react";
import { FrotasPrefeituraContext } from "@/app/frotas/frotas-prefeitura-context";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Bell,
  Car,
  ChartNoAxesCombined,
  ClipboardCheck,
  Fuel,
  KeyRound,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CurrentUserProfile } from "@/lib/auth-data";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import type { FrotaPrefeituraOption } from "@/lib/frotas-data";

type FrotasShellProps = {
  active:
    | "dashboard"
    | "veiculos"
    | "uso-veiculo"
    | "manutencao"
    | "abastecimento"
    | "postos"
    | "motoristas"
    | "secretarias"
    | "relatorios"
    | "alertas";
  actions?: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  prefeituras: FrotaPrefeituraOption[];
  profile: CurrentUserProfile;
  selectedPrefeituraId?: string;
  title: string;
};

const navOperacoes = [
  { key: "dashboard", label: "Painel", href: "/frotas", icon: LayoutDashboard },
  { key: "veiculos", label: "Veículos", href: "/frotas/veiculos", icon: Car },
  {
    key: "uso-veiculo",
    label: "Uso do Veículo",
    href: "/frotas/uso-veiculo",
    icon: KeyRound,
  },
  { key: "manutencao", label: "Manutenção", href: "/frotas/manutencao", icon: Wrench },
  { key: "abastecimento", label: "Abastecimento", href: "/frotas/abastecimento", icon: Fuel },
] as const;

const navCadastros = [
  { key: "postos", label: "Postos de Combustível", href: "/frotas/postos", icon: Fuel },
  { key: "motoristas", label: "Motoristas", href: "/frotas/motoristas", icon: UserRoundCog },
  { key: "secretarias", label: "Secretarias", href: "/frotas/secretarias", icon: ClipboardCheck },
] as const;

const navAdministracao = [
  {
    key: "relatorios",
    label: "Relatórios",
    href: "/frotas/relatorios",
    icon: ChartNoAxesCombined,
  },
  { key: "alertas", label: "Alertas", href: "/frotas/alertas", icon: Bell },
  { label: "Configurações", href: "#", icon: Settings },
] as const;

export async function FrotasShell({
  active,
  actions,
  children,
  icon: Icon,
  prefeituras,
  profile,
  selectedPrefeituraId,
  title,
}: FrotasShellProps) {
  const access = await getFrotasPermissionAccess(profile);
  const visibleOperacoes = navOperacoes.filter((item) => {
    if (item.key === "dashboard") {
      return true;
    }

    if (item.key === "veiculos") {
      return access.canViewVeiculos;
    }

    if (item.key === "uso-veiculo") {
      return access.canViewUsoVeiculo;
    }

    if (item.key === "manutencao") {
      return access.canViewManutencao;
    }

    if (item.key === "abastecimento") {
      return access.canViewAbastecimento;
    }

    return true;
  });
  const visibleCadastros = navCadastros.filter((item) => {
    if (access.isFullAccess) {
      return true;
    }

    if (!("key" in item)) {
      return false;
    }

    if (item.key === "postos") {
      return (
        access.keys.includes("fuel_stations.read") ||
        access.keys.includes("fuel_stations.manage")
      );
    }

    if (item.key === "motoristas") {
      return access.canViewMotoristas;
    }

    if (item.key === "secretarias") {
      return access.canViewSecretarias;
    }

    return false;
  });
  const visibleAdministracao = navAdministracao.filter((item) => {
    if ("key" in item && item.key === "relatorios") {
      return access.canViewRelatorios;
    }

    if ("key" in item && item.key === "alertas") {
      return access.isFullAccess;
    }

    return access.isFullAccess;
  });

  return (
    <SidebarProvider className="h-screen min-h-0 overflow-hidden print:block print:h-auto print:min-h-0 print:overflow-visible print:bg-white">
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <FrotasPrefeituraContext
            prefeituras={prefeituras}
            profile={profile}
            selectedPrefeituraId={selectedPrefeituraId}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Operações</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleOperacoes.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={active === item.key}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {visibleCadastros.length ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Cadastros</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleCadastros.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          isActive={"key" in item && active === item.key}
                          tooltip={item.label}
                          render={<Link href={item.href} />}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}
          {visibleAdministracao.length ? (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Administração</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleAdministracao.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          isActive={"key" in item && active === item.key}
                          tooltip={item.label}
                          render={<Link href={item.href} />}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarUserMenu
              profile={profile}
              tooltip="Conta Frotas Públicas"
              links={[
                {
                  href: "/portal",
                  icon: LayoutDashboard,
                  label: "Portal de módulos",
                },
                {
                  href: "/",
                  icon: ShieldCheck,
                  label: "Painel BDL Tech",
                },
                {
                  href: "#",
                  icon: UserRoundCog,
                  label: "Meu perfil",
                },
              ]}
            />
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-0 overflow-hidden print:m-0 print:block print:min-h-0 print:w-full print:overflow-visible print:rounded-none print:bg-white print:shadow-none">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 print:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            {Icon ? <Icon className="size-5 text-muted-foreground" /> : null}
            <h1 className="truncate text-xl font-semibold tracking-normal">
              {title}
            </h1>
          </div>
          {actions ? (
            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end">
              {actions}
            </div>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto print:block print:min-h-0 print:overflow-visible">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
