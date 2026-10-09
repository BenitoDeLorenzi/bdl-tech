import Screen from "@/app/frotas/manutencao/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
