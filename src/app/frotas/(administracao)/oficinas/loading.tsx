import Screen from "@/app/frotas/oficinas/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
