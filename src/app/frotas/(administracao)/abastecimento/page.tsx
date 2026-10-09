import { Suspense } from "react";
import Screen from "@/app/frotas/abastecimento/screen";
export const dynamic = "force-dynamic";
export default function Page(props: Parameters<typeof Screen>[0]) {
  return <Suspense fallback={<Screen {...props} loading />}><Screen {...props} /></Suspense>;
}
