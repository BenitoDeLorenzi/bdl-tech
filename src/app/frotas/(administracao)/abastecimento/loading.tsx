import Screen from "@/app/frotas/abastecimento/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
