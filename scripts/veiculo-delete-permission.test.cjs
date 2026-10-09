const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,deps){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n]});return exports;}
(async()=>{
 for(const role of ['municipal_admin','municipal_user','bdl_admin']){
  const profile={role,id:'user',prefeitura_id:'company'};
  const q={select(){return q},eq(){return Promise.resolve({data:[{permissoes:{chave:'vehicles.delete'}}]})}};
  const permissions=load('src/lib/frotas-permissions.ts',{'react':require('react'),'@/lib/empresa-access':{hasModuleAccess:async()=>true},'@/lib/supabase-server':{createSupabaseServerClient:()=>({from:()=>q})}});
  assert.equal((await permissions.getFrotasPermissionAccess(profile)).canDeleteVeiculos,role==='bdl_admin');
  assert.equal(await permissions.hasFrotasPermission(profile,'vehicles.delete'),role==='bdl_admin');
  if(role!=='bdl_admin'){
   let dbAccess=false;
   const actions=load('src/app/frotas/actions.ts',{'crypto':require('node:crypto'),'next/cache':{},'next/navigation':{redirect:url=>{throw Error(decodeURIComponent(url))}},'@/lib/auth-data':{requireUserProfile:async()=>profile},'@/lib/frotas-permissions':{hasFrotasPermission:async()=>true},'@/lib/posto-auth':{},'@/lib/supabase-server':{createSupabaseServerClient:()=>{dbAccess=true;throw Error('unexpected database access')}}});
   await assert.rejects(()=>actions.deleteVeiculo(new FormData()),/Master/);assert.equal(dbAccess,false);
  }
 }
 console.log('PASS: vehicle deletion is Master-only in UI permissions and server action, even with explicit delete permission.');
})().catch(e=>{console.error(e);process.exitCode=1});
