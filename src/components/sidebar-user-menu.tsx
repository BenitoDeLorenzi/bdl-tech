import Link from "next/link";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";

import { logoutAction } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { CurrentUserProfile } from "@/lib/auth-data";
import { formatUsuarioRole } from "@/lib/usuarios-data";

type SidebarUserMenuLink = {
  href: string;
  icon?: typeof LayoutDashboard;
  label: string;
};

type SidebarUserMenuProps = {
  links?: SidebarUserMenuLink[];
  profile: CurrentUserProfile;
  tooltip?: string;
};

type HeaderUserMenuProps = {
  links?: SidebarUserMenuLink[];
  profile: CurrentUserProfile;
};

const defaultLinks: SidebarUserMenuLink[] = [
  { href: "/portal", icon: LayoutDashboard, label: "Portal de módulos" },
  { href: "#", icon: UserRound, label: "Meu perfil" },
];

export function SidebarUserMenu({
  links = defaultLinks,
  profile,
  tooltip = "Conta",
}: SidebarUserMenuProps) {
  const roleLabel = formatUsuarioRole(profile.role);

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton size="lg" tooltip={tooltip}>
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {getInitials(profile.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{profile.nome}</span>
                <span className="truncate text-xs">{roleLabel}</span>
              </div>
            </SidebarMenuButton>
          }
        />
        <UserDropdownContent links={links} profile={profile} roleLabel={roleLabel} />
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function HeaderUserMenu({
  links = defaultLinks,
  profile,
}: HeaderUserMenuProps) {
  const roleLabel = formatUsuarioRole(profile.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-10 gap-2 px-2">
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">
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
          </Button>
        }
      />
      <UserDropdownContent links={links} profile={profile} roleLabel={roleLabel} />
    </DropdownMenu>
  );
}

function UserDropdownContent({
  links,
  profile,
  roleLabel,
}: {
  links: SidebarUserMenuLink[];
  profile: CurrentUserProfile;
  roleLabel: string;
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
        {links.map((item) => {
          const Icon = item.icon ?? LayoutDashboard;

          return (
            <DropdownMenuItem key={item.label} render={<Link href={item.href} />}>
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
