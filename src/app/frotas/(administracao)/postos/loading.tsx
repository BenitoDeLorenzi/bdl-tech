import Screen from "@/app/frotas/postos/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
