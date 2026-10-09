import { getNotificationScope } from "@/lib/frotas-notificacoes";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await getNotificationScope(new URL(request.url).searchParams.get("empresa"));
  if (!session) return new Response(null, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response(null, { status: 503 });
  const supabase = createSupabaseServerClient();
  const channel = supabase.channel(`fleet-notifications-${session.usuarioId}-${crypto.randomUUID()}`);
  let cleanup = (_closeStream = true) => { void _closeStream; };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (event: string) => {
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
      };
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);
      // Reconnect periodically to revalidate the user permissions and bound server lifetime.
      const expiry = setTimeout(() => cleanup(), 50000);
      cleanup = (closeStream = true) => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(expiry);
        request.signal.removeEventListener("abort", onAbort);
        void supabase.removeChannel(channel);
        if (closeStream) controller.close();
      };
      const onAbort = () => cleanup();
      request.signal.addEventListener("abort", onAbort, { once: true });
      if (request.signal.aborted) { cleanup(); return; }
      const changed = (payload: { new: Record<string, unknown> }) => {
        if (payload.new.prefeitura_id === session.empresaId && session.tipos.includes(String(payload.new.tipo)) && (!payload.new.destinatario_id || payload.new.destinatario_id === session.usuarioId)) send("changed");
      };
      channel.on("postgres_changes", {
        schema: "public", table: "frota_notificacoes", event: "INSERT", filter: `prefeitura_id=eq.${session.empresaId}`,
      }, changed).on("postgres_changes", {
        schema: "public", table: "frota_notificacao_leituras", event: "INSERT", filter: `usuario_id=eq.${session.usuarioId}`,
      }, payload => { if (payload.new.usuario_id === session.usuarioId) send("changed"); })
        .subscribe(status => {
          if (status === "SUBSCRIBED") send("ready");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") cleanup();
        });
    },
    cancel() { cleanup(false); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-store, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
