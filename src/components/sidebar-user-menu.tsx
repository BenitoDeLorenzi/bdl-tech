"use client";
import { useState } from "react";
import { PerfilDialog } from "@/app/perfil/perfil-dialog";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  UserRound,
  ShieldCheck,
  ChevronsUpDown,
} from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import type { CurrentUserProfile } from "@/lib/auth-data";
const formatUsuarioRole = (role: CurrentUserProfile["role"]) =>
  role === "bdl_admin"
    ? "Master"
    : role === "municipal_admin"
      ? "Administrador"
      : "Usuário";

type SidebarUserMenuLink = {
  href: string;
  icon?: typeof LayoutDashboard;
  label: string;
};

type SidebarUserMenuProps = {
  profile: CurrentUserProfile;
  tooltip?: string;
  emphasized?: boolean;
};

type HeaderUserMenuProps = {
  defaultProfileOpen?: boolean;
  profile: CurrentUserProfile;
};

function profileLinks(profile: CurrentUserProfile): SidebarUserMenuLink[] {
  return [
    { href: "/portal", icon: LayoutDashboard, label: "Portal de módulos" },
    ...(profile.role === "bdl_admin"
      ? [{ href: "/", icon: ShieldCheck, label: "Painel Vibe Tech" }]
      : []),
  ];
}

export function SidebarUserMenu({
  profile,
  tooltip = "Conta",
  emphasized = false,
}: SidebarUserMenuProps) {
  const roleLabel = formatUsuarioRole(profile.role);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              tooltip={tooltip}
              className={
                emphasized
                  ? "h-auto min-h-16 rounded-xl border border-sidebar-border bg-background/80 p-3 shadow-sm hover:bg-sidebar-accent data-[popup-open]:bg-sidebar-accent group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:shadow-none"
                  : undefined
              }
            >
              <Avatar className="size-8 rounded-lg">
                {profile.avatar_url && (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.nome}
                    className="rounded-lg"
                  />
                )}
                <AvatarFallback
                  className={
                    emphasized
                      ? "rounded-lg bg-primary text-primary-foreground font-semibold"
                      : "rounded-lg"
                  }
                >
                  {getInitials(profile.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 gap-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{profile.nome}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
              {emphasized && (
                <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
              )}
            </SidebarMenuButton>
          }
        />
        <UserDropdownContent
          links={profileLinks(profile)}
          profile={profile}
          roleLabel={roleLabel}
          onProfile={() => setProfileOpen(true)}
        />
      </DropdownMenu>
      <PerfilDialog
        profile={profile}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </SidebarMenuItem>
  );
}

export function HeaderUserMenu({
  profile,
  defaultProfileOpen = false,
}: HeaderUserMenuProps) {
  const [profileOpen, setProfileOpen] = useState(defaultProfileOpen);
  const roleLabel = formatUsuarioRole(profile.role);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              aria-label={`Conta de ${profile.nome}`}
              className="h-12 gap-3 rounded-xl border bg-background px-3 shadow-sm hover:bg-muted"
            >
              <Avatar className="size-8 rounded-lg">
                {profile.avatar_url && (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.nome}
                    className="rounded-lg"
                  />
                )}
                <AvatarFallback className="rounded-lg bg-primary font-semibold text-primary-foreground">
                  {getInitials(profile.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left text-sm leading-tight sm:grid">
                <span className="max-w-[160px] truncate font-semibold">
                  {profile.nome}
                </span>
                <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground" />
            </Button>
          }
        />
        <UserDropdownContent
          links={profileLinks(profile)}
          profile={profile}
          roleLabel={roleLabel}
          onProfile={() => setProfileOpen(true)}
        />
      </DropdownMenu>
      <PerfilDialog
        profile={profile}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </>
  );
}

function UserDropdownContent({
  links,
  profile,
  roleLabel,
  onProfile,
}: {
  links: SidebarUserMenuLink[];
  profile: CurrentUserProfile;
  roleLabel: string;
  onProfile: () => void;
}) {
  return (
    <DropdownMenuContent align="end" sideOffset={8} className="w-64">
      <DropdownMenuGroup>
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {profile.nome}
            </span>
            <span className="text-xs font-normal">{roleLabel}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onProfile}>
          <UserRound className="size-4" />
          Meu perfil
        </DropdownMenuItem>
        {links.map((item) => {
          const Icon = item.icon ?? LayoutDashboard;

          return (
            <DropdownMenuItem
              key={item.label}
              render={<Link href={item.href} />}
            >
              <Icon className="size-4" />
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="ghost"
          className="h-8 w-full justify-start gap-2 px-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </form>
    </DropdownMenuContent>
  );
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "BT";
}
