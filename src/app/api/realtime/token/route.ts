import { NextResponse } from "next/server";

import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";

export async function GET() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    accessToken: session.access_token,
    userId: session.user.id,
  });
}
