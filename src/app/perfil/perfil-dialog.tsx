"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CurrentUserProfile } from "@/lib/auth-data";
import type { PortalModulo } from "@/lib/portal-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DadosPerfilForm,
  FotoPerfilForm,
  SenhaPerfilForm,
} from "./perfil-forms";
import { getPerfilAcessos } from "./actions";

export function PerfilDialog({
  profile,
  open,
  onOpenChange,
}: {
  profile: CurrentUserProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [modules, setModules] = useState<PortalModulo[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    getPerfilAcessos()
      .then((data) => {
        if (active) {
          setModules(data);
          setError("");
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Não foi possível carregar seus módulos. Feche e abra o perfil para tentar novamente.",
          );
      });
    return () => {
      active = false;
    };
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription>
            Seus dados e acessos em todos os módulos.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="dados" className="min-h-0 gap-4">
          <TabsList className="h-10 w-full shrink-0">
            <TabsTrigger value="dados" className="flex-1">
              Dados pessoais
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="flex-1">
              Segurança
            </TabsTrigger>
            <TabsTrigger value="acesso" className="flex-1">
              Meu acesso
            </TabsTrigger>
          </TabsList>
          <div className="min-h-0 overflow-y-auto px-1 pb-1">
            <TabsContent value="dados" className="space-y-5">
              <FotoPerfilForm
                nome={profile.nome}
                avatarUrl={profile.avatar_url ?? null}
              />
              <div>
                <DadosPerfilForm
                  nome={profile.nome}
                  telefone={profile.telefone ?? ""}
                  email_contato={profile.email_contato ?? ""}
                />
              </div>
              <dl className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs">
                <div>
                  <dt className="text-muted-foreground">CPF / login</dt>
                  <dd>{profile.cpf ?? profile.username ?? "Não informado"}</dd>
                </div>
                <div>
                  <dt className="sr-only">Acesso</dt>
                  <dd className="text-muted-foreground">
                    Seu acesso continua pelo CPF.
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Para corrigir o CPF, fale com o administrador.
              </p>
            </TabsContent>
            <TabsContent value="seguranca">
              <SenhaPerfilForm />
            </TabsContent>
            <TabsContent value="acesso" className="space-y-5">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Empresa</dt>
                  <dd className="mt-1 font-medium">
                    {profile.prefeitura_nome ??
                      (profile.role === "bdl_admin"
                        ? "Vibe Tech"
                        : "Sem empresa vinculada")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tipo de usuário</dt>
                  <dd className="mt-1 font-medium">
                    {profile.role === "bdl_admin"
                      ? "Master"
                      : profile.role === "municipal_admin"
                        ? "Administrador"
                        : "Usuário"}
                  </dd>
                </div>
              </dl>
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">
                  Módulos disponíveis
                </h3>
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : modules === null ? (
                  <p className="text-sm text-muted-foreground">
                    Carregando acessos…
                  </p>
                ) : modules.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {modules.map((m) => (
                      <Link
                        key={m.id}
                        href={m.href}
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg border p-3 text-sm font-medium hover:bg-muted"
                      >
                        {m.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum módulo liberado.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Empresa e permissões são gerenciadas pelo administrador.
              </p>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
