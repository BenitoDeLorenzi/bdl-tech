import { redirect } from "next/navigation";
export default async function LegacyPage({params}:{params:Promise<{id:string}>}) { const {id}=await params;redirect("/empresas/"+encodeURIComponent(id)); }
