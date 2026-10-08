// Temporary isolated browser fixture. Never prints credentials or auth tokens.
// node --env-file=.env.local scripts/gestao-browser-fixture.mjs setup|cleanup
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const fixturePath = join(tmpdir(), "vibe-gestao-fixture.json");
const statePath = join(tmpdir(), "vibe-gestao-browser-state.json");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
function check(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
if (process.argv[2] === "setup") {
  try {
    await readFile(fixturePath);
    throw new Error("Fixture already exists; clean it up first.");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const email = `gestao-test-${randomUUID()}@example.com`;
  const password = randomUUID() + randomUUID();
  const { user } = check(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  await writeFile(fixturePath, JSON.stringify({ userId: user.id }));
  check(
    await admin
      .from("perfis")
      .upsert({
        id: user.id,
        nome: "Verificação temporária Gestão",
        email,
        role: "bdl_admin",
        ativo: true,
      }),
  );
  const empresa = check(await admin.from("empresas").insert({nome:"Quiosque · verificação temporária",status:"active"}).select("id").single());
  await writeFile(fixturePath,JSON.stringify({userId:user.id,empresaId:empresa.id}));
  const modulo=check(await admin.from("modulos").select("id").eq("slug","gestao-estabelecimentos").single());
  check(await admin.from("licencas").insert({prefeitura_id:empresa.id,modulo_id:modulo.id,status:"active",inicio:"2026-01-01",fim:"2027-12-31",valor_anual:0}));
  const unit=check(await admin.from("gestao_unidades").select("id").eq("empresa_id",empresa.id).single());
  const unitId=unit.id;
  await writeFile(fixturePath,JSON.stringify({userId:user.id,empresaId:empresa.id,unitId}));
  const cookies = [];
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: (values) => cookies.push(...values),
      },
    },
  );
  check(await client.auth.signInWithPassword({ email, password }));
  await writeFile(
    statePath,
    JSON.stringify({
      cookies: [
        ...cookies.map(({ name, value }) => ({
          name,
          value,
          domain: "localhost",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        })),
        {
          name: "gestao_unidade",
          value: unitId,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
  console.log("Temporary browser fixture ready:", statePath);
} else if (process.argv[2] === "cleanup") {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  if (fixture.empresaId) {
    for (const table of [
      "gestao_equipe_extrato",
      "gestao_fechamento_equipe",
      "gestao_equipe_trabalhos",
      "gestao_equipe_pagamentos",
      "gestao_colaboradores",
      "gestao_movimentos",
      "gestao_fechamentos",
      "gestao_produtos",
      "gestao_auditoria",
      "gestao_membros",
      "gestao_unidades",
      "gestao_categorias",
    ]) {
      check(
        await admin.from(table).delete().eq("empresa_id", fixture.empresaId),
      );
    }
    check(
      await admin.from("licencas").delete().eq("prefeitura_id", fixture.empresaId),
    );
  }
  if(fixture.empresaId) check(await admin.from("empresas").delete().eq("id",fixture.empresaId));
  check(await admin.auth.admin.deleteUser(fixture.userId));
  await unlink(fixturePath);
  await unlink(statePath).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
  console.log("Temporary fixture and credentials removed.");
} else throw new Error("Use setup or cleanup.");
