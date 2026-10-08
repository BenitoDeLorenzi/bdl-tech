import { EquipePage } from "./equipe-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; p?: string }>;
}) {
  return <EquipePage tipo="colaboradores" query={await searchParams} />;
}
