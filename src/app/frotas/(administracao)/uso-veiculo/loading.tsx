import Screen from "@/app/frotas/uso-veiculo/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} loading />;
}
