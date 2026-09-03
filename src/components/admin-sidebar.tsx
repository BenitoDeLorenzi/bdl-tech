import Link from "next/link";
import {
  Building2,
  Car,
  ClipboardList,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  PlugZap,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { CurrentUserProfile } from "@/lib/auth-data";

type AdminSidebarProps = {
  active:
    | "dashboard"
    | "prefeituras"
    | "licencas"
    | "usuarios"
    | "modulos"
    | "integracoes";
  profile: CurrentUserProfile;
};

const navOperacoes = [
  { key: "dashboard", label: "Visão geral", href: "/", icon: LayoutDashboard },
  { key: "prefeituras", label: "Prefeituras", href: "/prefeituras", icon: Building2 },
  { key: "licencas", label: "Licenças", href: "/licencas", icon: KeyRound },
  { key: "usuarios", label: "Usuários", href: "/usuarios", icon: Users },
] as const;

const navModulos = [
  { label: "Frotas Públicas", href: "/frotas", icon: Car },
] as const;

const navAdministracao = [
  { key: "integracoes", label: "Integrações", href: "/integracoes/plexi", icon: PlugZap },
  { key: "modulos", label: "Catálogo de módulos", href: "/modulos", icon: ClipboardList },
  { key: "configuracoes", label: "Configurações", href: "#", icon: Settings },
  { key: "seguranca", label: "Segurança", href: "#", icon: ShieldCheck },
] as const;

export function AdminSidebar({ active, profile }: AdminSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" isActive tooltip="BDL Tech">
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <ShieldCheck className="size-5" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-semibold">BDL Tech</span>
                <span className="truncate text-xs">Portal administrativo</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navOperacoes.map((item) => (
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

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navModulos.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    tooltip={`${item.label} · abrir em nova aba`}
                    render={
                      <Link href={item.href} target="_blank" rel="noreferrer" />
                    }
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    <ExternalLink className="ml-auto size-3.5 text-muted-foreground" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navAdministracao.map((item) => (
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarUserMenu profile={profile} tooltip="Conta BDL" />
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
