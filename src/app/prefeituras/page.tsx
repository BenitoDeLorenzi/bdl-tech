import { redirect } from "next/navigation";
export default async function LegacyPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const params=await searchParams;const query=new URLSearchParams();
 for(const [key,value] of Object.entries(params)) if(value) for(const item of Array.isArray(value)?value:[value]) query.append(key,item);
 redirect("/empresas"+(query.size?"?"+query.toString():""));
}
