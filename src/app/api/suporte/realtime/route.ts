import { getSupportScope } from "@/lib/suporte";
import { createSupabaseServerClient } from "@/lib/supabase-server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const scope = await getSupportScope(new URL(request.url).searchParams);
  if (!scope) return new Response(null, { status: 403 });
  const db = createSupabaseServerClient();
  const channel = db.channel(`support-${scope.profile.id}-${crypto.randomUUID()}`);
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const encoder = new TextEncoder();
      const send = (event: string) => { if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`)); };
      const heartbeat = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n")); }, 15000);
      const abort = () => { if (closed) return; cleanup(); controller.close(); };
      const expiry = setTimeout(abort, 50000);
      cleanup = () => { if (closed) return; closed = true; clearInterval(heartbeat); clearTimeout(expiry); request.signal.removeEventListener("abort", abort); void db.removeChannel(channel); };
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) { abort(); return; }
      channel.on("postgres_changes", { schema: "public", table: "suporte_conversas", event: "*", ...(scope.master ? {} : { filter: `usuario_id=eq.${scope.profile.id}` }) }, payload => {
        const row = payload.new as Record<string, unknown>;
        if (scope.master || (row.usuario_id === scope.profile.id && row.empresa_id === scope.empresa)) send("changed");
      }).on("postgres_changes", { schema: "public", table: "suporte_leituras", event: "*", filter: `usuario_id=eq.${scope.profile.id}` }, payload => {
        if ((payload.new as Record<string, unknown>).usuario_id === scope.profile.id) send("changed");
      }).subscribe(status => {
        if (status === "SUBSCRIBED") send("ready");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") abort();
      });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-store, no-transform", "X-Accel-Buffering": "no" } });
}
