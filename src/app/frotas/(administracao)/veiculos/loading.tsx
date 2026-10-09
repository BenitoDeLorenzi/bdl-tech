import Screen from "@/app/frotas/veiculos/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
