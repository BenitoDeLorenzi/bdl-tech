import { CadastroStatusButton } from "@/components/cadastro-status-button";
import { updateOficinaStatus } from "../cadastro-actions";
import { redirect } from "next/navigation";
import { Search, Wrench } from "lucide-react";
import { requireUserProfile } from "@/lib/auth-data";
import { getFrotasPermissionAccess } from "@/lib/frotas-permissions";
import { getFrotasData } from "@/lib/frotas-data";
import { getOficinasForEmpresa } from "@/lib/oficinas-data";
import { FrotasShell } from "../frotas-shell";
import { ListMetrics } from "@/components/list-metrics";
import { HeaderSeparator } from "@/components/header-separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DeleteOficinaButton } from "./delete-oficina-button";
import { OficinaDialog } from "./oficina-dialog";

export const dynamic = "force-dynamic";
export default async function OficinasPage({
  searchParams,
}: {
  searchParams: Promise<{ prefeitura?: string; q?: string }>;
}) {
  const profile = await requireUserProfile();
  const access = await getFrotasPermissionAccess(profile);
  const canManage =
    access.isFullAccess || access.keys.includes("workshops.manage");
  if (!canManage && !access.keys.includes("workshops.read"))
    redirect("/frotas");
  const params = await searchParams;
  const data = await getFrotasData({
    prefeituraId:
      profile.role === "bdl_admin"
        ? params.prefeitura
        : (profile.prefeitura_id ?? undefined),
  });
  const all = await getOficinasForEmpresa(data.selectedPrefeituraId);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const query = normalize(params.q?.trim() ?? "");
  const oficinas = all.filter(
    (item) =>
      normalize(
        [
          item.nome,
          item.documento,
          item.telefone,
          item.responsavel,
          item.endereco,
          item.especialidades,
        ].join(" "),
      ).includes(query) ||
      Boolean(
        query.replace(/\D/g, "") &&
        item.documento?.includes(query.replace(/\D/g, "")),
      ),
  );
  return (
    <FrotasShell
      active="oficinas"
      title="Oficinas"
      icon={Wrench}
      profile={profile}
      prefeituras={data.prefeituras}
      selectedPrefeituraId={data.selectedPrefeituraId}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <form className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                name="q"
                aria-label="Buscar oficina"
                placeholder="Buscar oficina"
                defaultValue={params.q}
                className="h-9 pl-9"
              />
            </div>
            <input
              type="hidden"
              name="prefeitura"
              value={data.selectedPrefeituraId ?? ""}
            />
            <Button variant="outline" type="submit">
              Filtrar
            </Button>
          </form>
          {canManage && data.selectedPrefeituraId ? (
            <>
              <HeaderSeparator />
              <OficinaDialog empresaId={data.selectedPrefeituraId} />
            </>
          ) : null}
        </div>
      }
    >
      <main className="flex flex-1 flex-col gap-3 p-4">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
                  <Wrench className="size-5 text-muted-foreground" />
                </div>
                <CardTitle>Oficinas cadastradas</CardTitle>
              </div>
              <ListMetrics
                items={[
                  { label: "Total", value: oficinas.length },
                  {
                    label: "Ativas",
                    value: oficinas.filter((item) => item.status === "active")
                      .length,
                    tone: "success",
                  },
                ]}
              />
            </div>
          </CardHeader>
          <CardContent>
            {oficinas.length ? (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Oficinas</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Especialidades</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage ? (
                        <TableHead className="text-right">Ações</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {oficinas.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.documento
                              ?.replace(
                                /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
                                "$1.$2.$3-$4",
                              )
                              .replace(
                                /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                                "$1.$2.$3/$4-$5",
                              ) ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{item.telefone ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.responsavel}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-64 whitespace-normal">
                          {item.endereco ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-52 whitespace-normal">
                          {item.especialidades ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              item.status === "active"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }
                          >
                            {item.status === "active" ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                            <OficinaDialog
                              empresaId={item.prefeitura_id}
                              oficina={item}
                            />
                            <CadastroStatusButton id={item.id} status={item.status} entity="oficina" action={updateOficinaStatus} />
                            {profile.role === "bdl_admin" ? <DeleteOficinaButton id={item.id} nome={item.nome} /> : null}
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/20 p-8">
                <Wrench className="size-8 text-muted-foreground" />
                <p className="font-medium">
                  {query
                    ? "Nenhuma oficina encontrada"
                    : "Nenhuma oficina cadastrada"}
                </p>
                {!query && canManage && data.selectedPrefeituraId ? (
                  <OficinaDialog empresaId={data.selectedPrefeituraId} />
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </FrotasShell>
  );
}
