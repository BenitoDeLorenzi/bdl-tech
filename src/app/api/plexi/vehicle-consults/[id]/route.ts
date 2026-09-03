import { NextResponse } from "next/server";

import { requireUserProfile } from "@/lib/auth-data";
import { refreshPlexiVehicleConsultResult } from "@/lib/plexi";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  await requireUserProfile();

  const { id } = await params;
  const supabase = createSupabaseServerClient();

  try {
    const result = await refreshPlexiVehicleConsultResult(supabase, id);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao consultar status da consulta automática.",
        status: "error",
      },
      { status: 500 }
    );
  }
}
