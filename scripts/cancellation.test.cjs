const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
async function run(name, options = {}) {
 const status = name === 'cancelAbastecimento' ? 'issued' : name === 'cancelManutencao' ? 'open' : 'in_use';
 let payload; const filters = {};
 const q = { select(){return q}, eq(k,v){filters[k]=v;return q}, update(v){if(v.motivo_cancelamento) payload=v;return q}, limit(){return Promise.resolve({data:[]})},
 single:async()=>({data:{id:'record',prefeitura_id:options.foreign?'other':'company',veiculo_id:'vehicle',status:options.status||status,expires_at:'2099-01-01'}}),
 maybeSingle:async()=>({data:options.race?null:{id:'record'}}) };
 const profile = {id:'session-user',nome:'Autor da sessão',role:'municipal_admin',prefeitura_id:'company'};
 const deps = {'crypto':require('node:crypto'),'next/cache':{revalidatePath(){}},'next/navigation':{},'@/lib/auth-data':{requireUserProfile:async()=>profile,getCurrentUserProfile:async()=>profile},'@/lib/frotas-permissions':{hasFrotasPermission:async()=>options.allowed!==false},'@/lib/posto-auth':{},'@/lib/supabase-server':{createSupabaseServerClient:()=>({from:()=>q})}};
 const exports={};const path=name==='cancelUsoVeiculo'?'src/app/frotas/uso-veiculo/actions.ts':'src/app/frotas/actions.ts';
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n]});
 const data=new FormData();data.set('id','record');data.set('motivo_cancelamento',options.reason??'  Erro de cadastro  ');data.set('atividade_por','forged');data.set('atividade_usuario_id','forged');
 const result=await exports[name]({},data);return {result,payload,filters};
}
(async()=>{
 for (const name of ['cancelAbastecimento','cancelManutencao','cancelUsoVeiculo']) {
  for(const options of [{allowed:false},{foreign:true},{reason:'       '},{reason:'curto'},{status:'cancelled'}]) {const r=await run(name,options);assert.ok(r.result.error);assert.equal(r.payload,undefined);}
  const r=await run(name);assert.ok(r.result.success);assert.equal(r.payload.motivo_cancelamento,'Erro de cadastro');assert.equal(r.payload.status,'cancelled');assert.ok(!Number.isNaN(Date.parse(r.payload.cancelled_at)));
  assert.ok((await run(name,{race:true})).result.error);
  assert.equal(r.payload.atividade_por,'Autor da sessão');assert.equal(r.payload.atividade_usuario_id,'session-user');
 }
 console.log('PASS: three cancellation actions enforce permission, company, status, trimmed reason, date and concurrent state changes.');
})().catch(e=>{console.error(e);process.exitCode=1});
