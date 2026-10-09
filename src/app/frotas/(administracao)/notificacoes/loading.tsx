import Screen from "@/app/frotas/notificacoes/screen";
export default function Loading() {
  return <Screen searchParams={Promise.resolve({})} />;
}
