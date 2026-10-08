"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-xl border p-8">
      <h1 className="text-lg font-semibold">
        Não foi possível carregar esta página
      </h1>
      <p className="my-3 text-sm text-muted-foreground">
        Verifique sua conexão e tente novamente. Seus registros salvos serão
        preservados.
      </p>
      <button onClick={reset} className="rounded-lg border px-4 py-2 text-sm">
        Tentar novamente
      </button>
    </div>
  );
}
