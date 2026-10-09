const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
async function run(spoof, company = 'company') {
 let inserted;
 const db = { rpc: async()=>({data:"OA-20261009-0005"}), from(table) {
  let writing = false;
  const q = { select() { return q; }, eq() { return q; }, update() { return q; }, lte() { return Promise.resolve({}); }, gte() { return Promise.resolve({count:0}); }, maybeSingle() { return Promise.resolve({data:null}); }, insert(payload) { writing = true; inserted = payload; return q; }, single() {
   if (table === 'frota_veiculos') return Promise.resolve({data:{id:'vehicle',prefeitura_id:company}});
   if (table === 'frota_postos_credenciados') return Promise.resolve({data:{id:'station',nome:'Station',prefeitura_id:company,status:'active'}});
   assert.ok(writing); return Promise.resolve({error:{message:'test stops after capturing insert'}});
  } }; return q;
 } };
 const dependencies = {
  crypto: require('node:crypto'), 'next/cache': {}, 'next/navigation': {},
  '@/lib/auth-data': {requireUserProfile:async()=>({nome:'Logged in user',role:'municipal_user',prefeitura_id:'company'})},
  '@/lib/frotas-permissions': {hasFrotasPermission:async()=>true},
  '@/lib/posto-auth': {}, '@/lib/supabase-server':{createSupabaseServerClient:()=>db}
 };
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>dependencies[name]});
 const form = new FormData();
 for (const [key,value] of Object.entries({veiculo_id:'vehicle',data_abastecimento:'2026-10-08',motorista:'Driver',posto_id:'station',combustivel:'Diesel'})) form.set(key,value);
 if (spoof) form.set('emitido_por',spoof);
 const result = await exports.createAbastecimento({},form);
 return {inserted,result};
}
(async()=>{
 assert.equal((await run()).inserted.emitido_por,'Logged in user');
 assert.equal((await run('Forged issuer')).inserted.emitido_por,'Logged in user');
 const foreign = await run(null,'other-company');
 assert.equal(foreign.inserted,undefined); assert.ok(foreign.result.error);
 console.log('PASS: session issuer without form field, forged issuer ignored, foreign company rejected.');
})().catch(error=>{console.error(error);process.exitCode=1;});
