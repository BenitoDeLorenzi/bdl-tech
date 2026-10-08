import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

// Integration test: real database persistence, simulated Plexi responses (no billed consultations).
const nativeRequire = createRequire(import.meta.url);
const realFetch = globalThis.fetch;
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }, global: { fetch: realFetch },
});
const today = new Date().toISOString().slice(0, 10);
const licensed = await db.from("licencas").select("prefeitura_id,modulos!inner(slug)")
  .eq("modulos.slug", "frotas-publicas").eq("status", "active").lte("inicio", today).gte("fim", today).limit(1).single();
assert.ifError(licensed.error);
const companyId = licensed.data.prefeitura_id;
const vehicleIds = [];
const profile = { id: "test-actor", role: "bdl_admin", prefeitura_id: null };
const jobs = [];
function loadSource(path, stubs) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", output)((id) => {
    if (id === "server-only") return {};
    if (id in stubs) return stubs[id];
    return nativeRequire(id);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const dbStub = { createSupabaseServerClient: () => db };
const worker = loadSource("src/lib/plexi-vehicle-lookups.ts", { "@/lib/supabase-server": dbStub });
const route = loadSource("src/app/api/frotas/veiculos/consulta/route.ts", {
  "next/server": { after: (job) => jobs.push(job), NextResponse: { json: (body, init) => Response.json(body, init) } },
  "@/lib/auth-data": { getCurrentUserProfile: async () => profile },
  "@/lib/empresa-access": { getModuleLicensedEmpresas: async () => [{ id: companyId }] },
  "@/lib/frotas-permissions": { hasFrotasPermission: async () => true },
  "@/lib/supabase-server": dbStub,
  "@/lib/plexi-vehicle-lookups": worker,
});
const pdfRoute = loadSource("src/app/api/frotas/veiculos/[id]/documento-plexi/route.ts", {
  "next/server": { NextResponse: class extends Response {} },
  "@/lib/auth-data": { getCurrentUserProfile: async () => profile },
  "@/lib/empresa-access": { getModuleLicensedEmpresas: async () => [{ id: companyId }] },
  "@/lib/frotas-permissions": { getFrotasPermissionAccess: async () => ({ canViewVeiculos: true }) },
  "@/lib/supabase-server": dbStub,
});
const post = (body) => route.POST(new Request("http://localhost/api/frotas/veiculos/consulta", {
  method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
}));
async function leaseExpired(id) {
  const result = await db.from("frota_debito_consultas").update({ updated_at: new Date(Date.now() - 60_000).toISOString() }).eq("veiculo_id", id);
  assert.ifError(result.error);
}
async function state(id) {
  const vehicle = await db.from("frota_veiculos").select("status,marca,modelo,ano_modelo,data_aquisicao,consulta_raw").eq("id", id).single();
  const lookup = await db.from("frota_debito_consultas").select("id,status,id_consult,error_message").eq("veiculo_id", id).single();
  assert.ifError(vehicle.error); assert.ifError(lookup.error);
  return { vehicle: vehicle.data, lookup: lookup.data };
}
const previousConfig = { enabled: process.env.PLEXI_API_ENABLED, certificate: process.env.PLEXI_CERTIFICATE_ID };
process.env.PLEXI_API_ENABLED = "true";
process.env.PLEXI_CERTIFICATE_ID ||= "test-certificate";
try {
  for (const [index, scenario] of ["success", "404", "520", "timeout", "duplicate", "legacy"].entries()) {
    // Use plates unique to this run and never alter an existing vehicle.
    const placa = `TST${index}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 90 + 10)}`;
    const renavam = "01317301622";
    const claims = Buffer.from(JSON.stringify({ requestId: "test-existing-protocol", userId: profile.id, expiresAt: Date.now() + 60_000 })).toString("base64url");
    const signature = createHmac("sha256", process.env.PLEXI_API_TOKEN).update(claims).digest("base64url");
    const result = await post({ placa, renavam, prefeituraId: companyId, ...(scenario === "legacy" ? { legacyToken: `${claims}.${signature}` } : {}) });
    assert.equal(result.status, 202);
    const { vehicleId } = await result.json();
    vehicleIds.push(vehicleId);
    assert.equal((await state(vehicleId)).vehicle.status, "processing");
    const duplicate = await post({ placa, renavam, prefeituraId: companyId });
    assert.equal((await duplicate.json()).vehicleId, vehicleId);
    let externalPosts = 0;
    let resultChecks = 0;
    globalThis.fetch = async (url, options) => {
      assert.match(String(url), /plexi/);
      if (scenario === "timeout") throw new DOMException("Simulated Plexi timeout", "TimeoutError");
      if (options.method === "POST") {
        externalPosts++;
        return Response.json({ requestId: "test-protocol" }, { status: scenario === "duplicate" ? 409 : 201 });
      }
      resultChecks++;
      if (scenario === "404" || scenario === "520") return new Response(null, { status: Number(scenario) });
      if (scenario === "success" && resultChecks === 1) return new Response(null, { status: 202 });
      return Response.json({ placa, renavam, marca: "Teste", modelo: "Veículo de verificação", anoFabricacao: "2023", anoModelo: "2024", dataAquisicao: "19/09/2024", tipo: "Automovel", combustivel: "Gasolina", debitos: scenario === "legacy" ? [] : [
        { classe: "Licenciamento Anual 2026", numeroDetranNET: "lic-test", vencimento: "30/12/2026", valorAtual: 149.37, exercicio: 2026 },
        { classe: "IPVA 2026", numeroDetranNET: "ipva-test", vencimento: "19/09/2026", valorAtual: "R$ 1.234,56", exercicio: 2026 },
      ], historicoMultas: [{ numeroAuto: "AUTO-HIST", valor: 130.16, data: "19/09/2025", situacao: "Penalidade notificada", descricao: "Infração de teste" }],
      multasPagar: [{ numeroAuto: "AUTO-PAGAR", valor: 149.37, data: "19/09/2026", descricao: "Multa pendente de teste" }],
      recursoInfracao: [{ processo: "JARI TESTE", numeroAuto: "AUTO-PAGAR", resultadoProcesso: "Efeito Suspensivo" }],
      processos: [], ultimoProcesso: { processo: "PROC TESTE", situacao: "Encerrado", servicos: [{ nome: "Transferência" }, { nome: "Emissão" }] },
      pdf: Buffer.from("%PDF-1.7\nTest fixture").toString("base64"),
      });
    };
    await worker.processVehicleLookup(vehicleId);
    if (scenario === "success") {
      assert.equal((await state(vehicleId)).vehicle.status, "processing");
      await leaseExpired(vehicleId);
      await worker.processVehicleLookup(vehicleId);
    }
    const saved = await state(vehicleId);
    if (["success", "duplicate", "legacy"].includes(scenario)) {
      assert.equal(saved.vehicle.status, "active");
      assert.equal(saved.lookup.status, "success");
      assert.equal(saved.vehicle.ano_modelo, 2024);
      assert.equal(saved.vehicle.data_aquisicao, "2024-09-19");
      assert.equal(externalPosts, scenario === "legacy" ? 0 : 1);
      assert.ok(saved.vehicle.consulta_raw);
      const fines = await db.from("frota_multas_veiculares").select("id,origem,situacao").eq("veiculo_id", vehicleId);
      const resources = await db.from("frota_recursos_infracao").select("id,resultado_processo").eq("veiculo_id", vehicleId);
      const processes = await db.from("frota_processos_veiculares").select("id,servicos").eq("veiculo_id", vehicleId);
      assert.ifError(fines.error); assert.ifError(resources.error); assert.ifError(processes.error);
      assert.equal(fines.data.length, 2);
      assert.equal(resources.data[0].resultado_processo, "Efeito Suspensivo");
      assert.equal(processes.data[0].servicos.length, 2);
      await worker.importSavedVehicleLookup(saved.lookup.id);
      assert.equal((await db.from("frota_multas_veiculares").select("id").eq("veiculo_id", vehicleId)).data.length, 2);
      assert.equal((await db.from("frota_recursos_infracao").select("id").eq("veiculo_id", vehicleId)).data.length, 1);
      assert.equal((await db.from("frota_processos_veiculares").select("id").eq("veiculo_id", vehicleId)).data.length, 1);
      const pdf = await pdfRoute.GET(new Request("http://localhost/documento-plexi?download=1"), { params: Promise.resolve({ id: vehicleId }) });
      assert.equal(pdf.status, 200);
      assert.equal(pdf.headers.get("Content-Type"), "application/pdf");
      assert.match(pdf.headers.get("Content-Disposition"), /attachment/);
      assert.match(await pdf.text(), /^%PDF-/);
      profile.role = "municipal_admin";
      assert.equal((await pdfRoute.GET(new Request("http://localhost/documento-plexi"), { params: Promise.resolve({ id: vehicleId }) })).status, 404);
      profile.role = "bdl_admin";
      const debts = await db.from("frota_debitos_veiculares").select("type,amount,due_date,is_expired,year").eq("veiculo_id", vehicleId).order("amount");
      assert.ifError(debts.error);
      assert.equal(debts.data.length, scenario === "legacy" ? 0 : 2);
      if (scenario !== "legacy") {
        assert.equal(debts.data[0].type, "licensing");
        assert.equal(debts.data[0].amount, 149.37);
        assert.equal(debts.data[0].due_date.slice(0, 10), "2026-12-30");
        assert.equal(debts.data[1].type, "ipva");
        assert.equal(debts.data[1].amount, 1234.56);
        assert.equal(debts.data[1].is_expired, true);
      }
      if (scenario === "success") {
        const manual = await db.from("frota_multas_veiculares").insert({ prefeitura_id: companyId, veiculo_id: vehicleId, origem: "manual", numero_auto: "AUTO-MANUAL", valor: 50 });
        assert.ifError(manual.error);
        const interrupted = await db.from("frota_veiculos").update({ status: "processing", marca: "", modelo: "" }).eq("id", vehicleId);
        assert.ifError(interrupted.error);
        globalThis.fetch = async () => { throw new Error("Recovery must use the persisted result without calling Plexi"); };
        assert.equal(await worker.processVehicleLookup(vehicleId), true);
        assert.equal((await state(vehicleId)).vehicle.modelo, "Veículo de verificação");
        assert.equal((await state(vehicleId)).vehicle.status, "active");
        const replayedDebts = await db.from("frota_debitos_veiculares").select("id").eq("veiculo_id", vehicleId);
        assert.ifError(replayedDebts.error);
        assert.equal(replayedDebts.data.length, 2);
        const preserved = await db.from("frota_multas_veiculares").select("origem").eq("veiculo_id", vehicleId);
        assert.ifError(preserved.error);
        assert.equal(preserved.data.length, 3);
        assert.ok(preserved.data.some((fine) => fine.origem === "manual"));
        console.log("PASS interrupted database update recovered from saved result");
      }
    } else if (scenario === "timeout") {
      assert.equal(saved.vehicle.status, "processing");
      assert.match(saved.lookup.error_message, /Sem resposta/);
    } else {
      assert.equal(saved.vehicle.status, "consult_error");
      assert.equal(saved.lookup.status, "error");
      assert.match(saved.lookup.error_message, new RegExp(scenario));
    }
    console.log(`PASS ${scenario}: reservation → persisted protocol → ${saved.lookup.status}`);
  }
  const denied = await post({ placa: "TST9A99", renavam: "01317301622", prefeituraId: "00000000-0000-0000-0000-000000000000" });
  assert.equal(denied.status, 403);
  console.log("PASS unauthorized company rejected");
  const realJsonPath = process.argv[2];
  if (realJsonPath && existsSync(realJsonPath)) {
    const source = JSON.parse(readFileSync(realJsonPath, "utf8"));
    const placa = `TST8${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 90 + 10)}`;
    const renavam = "01317301622";
    const created = await post({ placa, renavam, prefeituraId: companyId });
    assert.equal(created.status, 202);
    const { vehicleId } = await created.json();
    vehicleIds.push(vehicleId);
    globalThis.fetch = async (_url, options) => options.method === "POST"
      ? Response.json({ requestId: "real-json-fixture" }, { status: 201 })
      : Response.json({ ...source, placa, renavam });
    await worker.processVehicleLookup(vehicleId);
    const outcome = await state(vehicleId);
    assert.equal(outcome.vehicle.status, "active");
    assert.equal(outcome.vehicle.modelo, source.modelo);
    const fines = await db.from("frota_multas_veiculares").select("origem,numero_auto").eq("veiculo_id", vehicleId);
    const resources = await db.from("frota_recursos_infracao").select("id").eq("veiculo_id", vehicleId);
    const processes = await db.from("frota_processos_veiculares").select("servicos").eq("veiculo_id", vehicleId);
    const debts = await db.from("frota_debitos_veiculares").select("type,amount,title").eq("veiculo_id", vehicleId);
    for (const result of [fines, resources, processes, debts]) assert.ifError(result.error);
    assert.equal(fines.data.filter((fine) => fine.origem === "historico").length, source.historicoMultas.length);
    assert.equal(fines.data.filter((fine) => fine.origem === "pagar").length, source.multasPagar.length);
    assert.equal(resources.data.length, source.recursoInfracao.length);
    assert.equal(processes.data[0].servicos.length, source.ultimoProcesso.servicos.length);
    assert.equal(debts.data.length, source.debitos.length);
    assert.equal(Math.round(debts.data.reduce((sum, debt) => sum + debt.amount, 0) * 100), Math.round(source.valorTotalDebitos * 100));
    assert.ok(debts.data.every((debt) => debt.type === "ticket" && debt.title.startsWith("Multa ")));
    const pdf = await pdfRoute.GET(new Request("http://localhost/documento-plexi"), { params: Promise.resolve({ id: vehicleId }) });
    assert.equal(pdf.status, 200);
    assert.ok((await pdf.arrayBuffer()).byteLength > 1000);
    await worker.importSavedVehicleLookup(outcome.lookup.id);
    assert.equal((await db.from("frota_multas_veiculares").select("id").eq("veiculo_id", vehicleId)).data.length, fines.data.length);
    console.log("PASS real JSON: all fines, debts, resources, services and PDF imported without duplicates");
  }
} finally {
  globalThis.fetch = realFetch;
  process.env.PLEXI_API_ENABLED = previousConfig.enabled;
  process.env.PLEXI_CERTIFICATE_ID = previousConfig.certificate;
  if (vehicleIds.length) {
    const removed = await db.from("frota_veiculos").delete().in("id", vehicleIds).eq("prefeitura_id", companyId);
    assert.ifError(removed.error);
    const remaining = await db.from("frota_veiculos").select("id").in("id", vehicleIds);
    assert.ifError(remaining.error);
    assert.equal(remaining.data.length, 0);
    console.log("PASS test records removed");
  }
}
