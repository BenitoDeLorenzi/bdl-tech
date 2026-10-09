import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function LegacyVeiculoVencimentosPage({
  params,
  searchParams,
}: PageProps) {
  const routeParams = await params;
  const queryParams = await searchParams;
  const query = new URLSearchParams();

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  redirect(
    `/frotas/veiculos/${routeParams.id}/debitos${
      queryString ? `?${queryString}` : ""
    }`
  );
}
