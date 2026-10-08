import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPostoSession } from "@/lib/posto-auth";
import { PostoLoginForm } from "../login-form";

export const dynamic = "force-dynamic";

export default async function PostoLoginPage() {
  const session = await getPostoSession();

  if (session) {
    redirect("/frotas/posto");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-muted/30 lg:grid-cols-[420px_1fr]">
      <section className="hidden min-h-screen flex-col justify-between bg-primary p-8 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <BrandMark />
          </div>
          <div>
            <div className="text-lg font-semibold">Vibe Tech</div>
            <div className="text-sm text-primary-foreground/70">
              Portal do posto
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-normal">
            Conclua ordens de abastecimento.
          </h1>
          <p className="text-sm leading-6 text-primary-foreground/70">
            Acesso exclusivo para postos credenciados.
          </p>
        </div>

        <div className="text-sm text-primary-foreground/60">
          Vibe Tech · Vibe Frotas
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-[420px] shadow-sm">
          <CardHeader className="space-y-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <BrandMark />
            </div>
            <CardTitle className="text-2xl">Portal do posto</CardTitle>
            <CardDescription>Informe o CNPJ para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <PostoLoginForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
