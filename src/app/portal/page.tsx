import Link from "next/link";
import { Building2, Car, LayoutDashboard, Store } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

import { HeaderUserMenu } from "@/components/sidebar-user-menu";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUserProfile } from "@/lib/auth-data";
import { getPortalModules, type PortalModulo } from "@/lib/portal-data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ perfil?: string }>;
}) {
  const query = await searchParams;
  const profile = await requireUserProfile();
  const modules = await getPortalModules(profile);

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrandMark className="size-9" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">Vibe Tech</div>
              <div className="truncate text-xs text-muted-foreground">
                Portal de módulos
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {profile.prefeitura_brasao_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.prefeitura_brasao_url}
                  alt={`Logotipo de ${profile.prefeitura_nome ?? "empresa"}`}
                  className="size-full object-contain p-1"
                />
              ) : (
                <Building2 className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="hidden min-w-0 text-center sm:block">
              <div className="max-w-[320px] truncate text-sm font-semibold">
                {profile.prefeitura_nome ?? "Equipe Vibe Tech"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {profile.prefeitura_nome
                  ? "Portal da empresa"
                  : "Portal administrativo"}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 justify-end">
            <HeaderUserMenu
              profile={profile}
              defaultProfileOpen={query.perfil === "1"}
            />
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Escolha um módulo
            </h1>
            <p className="text-sm text-muted-foreground">
              Acesse os ambientes liberados para o seu usuário.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {modules.length} {modules.length === 1 ? "acesso" : "acessos"}
          </Badge>
        </div>

        {modules.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-background/80">
            <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
                <Building2 className="size-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">Nenhum módulo liberado</div>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Seu usuário ainda não possui acesso a um módulo ativo.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

function ModuleCard({ module }: { module: PortalModulo }) {
  const Icon =
    module.slug === "bdl-admin"
      ? LayoutDashboard
      : module.slug === "gestao-estabelecimentos"
        ? Store
        : Car;
  const disabled = module.href === "#";

  return (
    <Card className={cn("overflow-hidden", disabled && "opacity-70")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <Badge variant={disabled ? "secondary" : "outline"}>
            {module.tag}
          </Badge>
        </div>
        <CardTitle className="text-lg">{module.label}</CardTitle>
        <CardDescription>{module.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {disabled ? (
          <Button className="w-full" variant="secondary" disabled>
            Indisponível
          </Button>
        ) : (
          <Link
            href={module.href}
            className={buttonVariants({ className: "w-full" })}
          >
            Acessar
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
