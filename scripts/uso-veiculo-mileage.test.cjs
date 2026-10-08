const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function run({ initial = 100, submitted = 150, insertError = false, updateError = false, concurrent = null } = {}) {
  let mileage = initial;
  let inserted = false;
  let updates = 0;
  const paths = [];
  const supabase = { from(table) {
    let payload;
    const query = {
      select() { return query; },
      eq() { return query; },
      async single() { return { data: { id: 'vehicle', prefeitura_id: 'company', quilometragem: initial, status: 'active' } }; },
      async maybeSingle() { return { data: null }; },
      async insert() {
        assert.equal(table, 'frota_uso_veiculos');
        inserted = !insertError;
        if (concurrent !== null) mileage = concurrent;
        return { error: insertError ? { message: 'insert failed' } : null };
      },
      update(value) { payload = value; updates++; return query; },
      async or(filter) {
        assert.equal(table, 'frota_veiculos');
        assert.ok(inserted, 'Update only after recording departure');
        assert.equal(filter, `quilometragem.is.null,quilometragem.lt.${submitted}`);
        if (!updateError && (mileage === null || mileage < submitted)) mileage = payload.quilometragem;
        return { error: updateError ? { message: 'update failed' } : null };
      },
    };
    return query;
  } };
  const dependencies = {
    'next/cache': { revalidatePath: (path) => paths.push(path) },
    'next/navigation': {},
    '@/lib/auth-data': { requireUserProfile: async () => ({ id: 'user', prefeitura_id: 'company', role: 'municipal_user' }) },
    '@/lib/frotas-permissions': { hasFrotasPermission: async () => true },
    '@/lib/supabase-server': { createSupabaseServerClient: () => supabase },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/uso-veiculo/actions.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: (name) => dependencies[name] });
  const form = new FormData();
  for (const [key, value] of Object.entries({ veiculo_id: 'vehicle', funcionario_nome: 'Motorista teste', km_saida: String(submitted) })) form.set(key, value);
  const result = await exports.createUsoVeiculo({}, form);
  return { result, mileage, inserted, updates, paths };
}

async function main() {
  const success = await run();
  assert.ok(success.result.success);
  assert.equal(success.mileage, 150);
  assert.ok(success.paths.includes('/frotas/veiculos/vehicle'));
  assert.equal((await run({ initial: null })).mileage, 150);
  assert.equal((await run({ initial: 150 })).mileage, 150);
  const lower = await run({ submitted: 90 });
  assert.ok(lower.result.error);
  assert.equal(lower.inserted, false);
  assert.equal(lower.updates, 0);
  const failed = await run({ insertError: true });
  assert.equal(failed.updates, 0);
  assert.equal(failed.mileage, 100);
  assert.equal((await run({ concurrent: 200 })).mileage, 200);
  const partial = await run({ updateError: true });
  assert.equal(partial.inserted, true);
  assert.match(partial.result.error, /retirada foi registrada/);
  assert.equal(partial.result.success, undefined);
  console.log('PASS: departure mileage, null/equal values, lower mileage rejection, insert failure, concurrent higher mileage and update failure.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
