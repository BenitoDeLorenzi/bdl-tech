import Screen from "@/app/frotas/motoristas/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
