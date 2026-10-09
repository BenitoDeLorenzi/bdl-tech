const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function run(name, options = {}) {
  const isUsage = name.includes('UsoVeiculo');
  const table = isUsage ? 'frota_uso_veiculos' : 'frota_manutencoes';
  const profile = { id: 'session-user', nome: 'Autor da sessão', role: 'municipal_admin', prefeitura_id: 'company' };
  let payload;
  const db = { from(currentTable) {
    let mutation = false;
    const row = { id: 'record', nome: 'Oficina', prefeitura_id: options.foreign ? 'other' : 'company', veiculo_id: 'vehicle', km_saida: 100, quilometragem: 100, status: options.status || (currentTable === 'frota_veiculos' ? 'active' : isUsage ? 'in_use' : 'open') };
    const q = {
      select() { return q; }, eq() { return q; }, or() { return q; },
      insert(value) { mutation = true; if (currentTable === table) payload = value; return q; },
      update(value) { mutation = true; if (currentTable === table) payload = value; return q; },
      single: async () => ({ data: row }),
      maybeSingle: async () => ({ data: mutation ? options.race ? null : row : currentTable === 'frota_uso_veiculos' ? null : row }),
      then(resolve, reject) { return Promise.resolve({ data: mutation ? row : null, error: null }).then(resolve, reject); },
    };
    return q;
  } };
  const dependencies = {
    crypto: require('node:crypto'), 'next/cache': { revalidatePath() {} }, 'next/navigation': {},
    '@/lib/auth-data': { requireUserProfile: async () => profile, getCurrentUserProfile: async () => profile },
    '@/lib/frotas-permissions': { hasFrotasPermission: async () => options.allowed !== false },
    '@/lib/supabase-server': { createSupabaseServerClient: () => db },
  };
  const exports = {};
  const path = isUsage ? 'src/app/frotas/uso-veiculo/actions.ts' : 'src/app/frotas/actions.ts';
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: key => dependencies[key], File });
  const form = new FormData();
  for (const [key, value] of Object.entries({ id: 'record', veiculo_id: 'vehicle', oficina_id: 'workshop', tipo: 'preventive', descricao: 'Serviço', data_entrada: '2026-10-09', data_saida: '2026-10-09', valor: '10', funcionario_nome: 'Motorista', km_saida: '100', km_retorno: '110', atividade_por: 'forged', atividade_usuario_id: 'forged' })) form.set(key, value);
  return { result: await exports[name]({}, form), payload };
}

(async () => {
  for (const name of ['createManutencao', 'finishManutencao', 'createUsoVeiculo', 'returnUsoVeiculo']) {
    const { result, payload } = await run(name);
    assert.ok(result.success, `${name}: ${result.error}`);
    assert.equal(payload.atividade_usuario_id, 'session-user');
    assert.equal(payload.atividade_por, 'Autor da sessão');
    for (const options of [{ foreign: true }, { allowed: false }]) {
      const denied = await run(name, options);
      assert.ok(denied.result.error);
      assert.equal(denied.payload, undefined);
    }
    if (!name.startsWith('create')) {
      assert.ok((await run(name, { status: 'cancelled' })).result.error);
      assert.ok((await run(name, { race: true })).result.error);
    }
  }
  console.log('PASS: maintenance/usage creation and completion actor attribution, forged actor ignored, permission/company isolation and concurrent cancellation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
