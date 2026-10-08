const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/app/frotas/oficinas/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
async function run(role, result = { data: { id: 'usage', veiculo_id: 'vehicle' } }) {
  let deleted = false;
  const paths = [];
  const query = { delete() { deleted = true; return query; }, eq(key, value) { assert.equal(key, 'id'); assert.equal(value, 'usage'); return query; }, select() { return query; }, async maybeSingle() { return result; } };
  const deps = {
    'next/cache': { revalidatePath: path => paths.push(path) },
    'next/navigation': {},
    '@/lib/auth-data': { requireUserProfile: async () => ({ role }) },
    '@/lib/frotas-permissions': { hasFrotasPermission: async () => true },
    '@/lib/frotas-data': {},
    '@/lib/supabase-server': { createSupabaseServerClient: () => ({ from(table) { assert.equal(table, 'frota_oficinas'); return query; } }) },
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => deps[name] });
  const form = new FormData(); form.set('id', 'usage');
  return { result: await exports.deleteOficina({}, form), deleted, paths };
}
(async () => {
  for (const role of ['municipal_admin', 'municipal_user', 'admin', 'user']) {
    const denied = await run(role);
    assert.ok(denied.result.error); assert.equal(denied.deleted, false);
  }
  const allowed = await run('bdl_admin');
  assert.ok(allowed.result.success); assert.equal(allowed.deleted, true);
  assert.ok(allowed.paths.includes('/frotas/oficinas'));
  assert.ok(allowed.paths.includes('/frotas/manutencao'));
  const linked = await run('bdl_admin', { error: { code: '23503' } });
  assert.match(linked.result.error, /inativ/);
  assert.ok((await run('bdl_admin', { data: null })).result.error);
  assert.ok((await run('bdl_admin', { error: { message: 'failure' } })).result.error);
  console.log('PASS: Master-only deletion, target record, refresh paths, missing record and database error.');
})().catch(error => { console.error(error); process.exitCode = 1; });
