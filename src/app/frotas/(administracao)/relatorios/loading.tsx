import Screen from "@/app/frotas/relatorios/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
