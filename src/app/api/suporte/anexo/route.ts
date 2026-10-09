import { getSupportScope, getSupportTicket, supportBucket } from "@/lib/suporte";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const scope = await getSupportScope(params);
  if (!scope) return new Response(null, { status: 403 });
  const id = params.get("mensagem") ?? "";
  const index = Number(params.get("indice"));
  if (!/^[1-9]\d{0,14}$/.test(id) || !Number.isInteger(index) || index < 0 || index > 2) return new Response(null, { status: 400 });
  const db = createSupabaseServerClient();
  const { data } = await db.from("suporte_mensagens").select("conversa_id,anexos").eq("id", id).maybeSingle();
  if (!data || !(await getSupportTicket(scope, data.conversa_id))) return new Response(null, { status: 404 });
  const file = (data.anexos as Array<{ path: string }>)[index];
  if (!file?.path.startsWith(`${data.conversa_id}/`)) return new Response(null, { status: 404 });
  const result = await db.storage.from(supportBucket).download(file.path);
  if (result.error) return new Response(null, { status: 404 });
  return new Response(result.data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="imagem.webp"' } });
}
