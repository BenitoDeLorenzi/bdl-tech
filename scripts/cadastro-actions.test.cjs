const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function run(action,options={}){
 let touched=false,deleted=false,payload;const filters={};
 const q={select(){return q},eq(k,v){filters[k]=v;return q},update(v){payload=v;return q},delete(){deleted=true;return q},limit:async()=>({data:options.linked?[{id:'usage'}]:[],error:options.readError?{}:null}),maybeSingle:async()=>({data:options.missing?null:{id:'record'},error:options.dbError?{code:'23503'}:null})};
 const exports={};const deps={'next/cache':{revalidatePath(){}},'@/lib/auth-data':{requireUserProfile:async()=>({role:options.role??'bdl_admin',prefeitura_id:'company'})},'@/lib/frotas-permissions':{hasFrotasPermission:async()=>options.allowed!==false},'@/lib/supabase-server':{createSupabaseServerClient:()=>({from:()=>{touched=true;return q}})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/cadastro-actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n]});
 const form=new FormData();form.set('id','record');form.set('status',options.status??'inactive');const result=await exports[action]({},form);return {result,touched,deleted,payload,filters};
}
(async()=>{
 for(const action of ['deletePosto','deleteMotorista']){
  for(const role of ['municipal_admin','municipal_user']){const r=await run(action,{role});assert.ok(r.result.error);assert.equal(r.touched,false)}
  for(const opts of [{allowed:false},{linked:true},{readError:true}]){const r=await run(action,opts);assert.ok(r.result.error);assert.equal(r.deleted,false)}
  assert.ok((await run(action)).result.success);
  for(const opts of [{missing:true},{dbError:true}])assert.ok((await run(action,opts)).result.error);
 }
 for(const action of ['updateOficinaStatus','updatePostoStatus']){
  for(const opts of [{allowed:false},{status:'invalid'}]){const r=await run(action,opts);assert.ok(r.result.error);assert.equal(r.touched,false)}
  for(const status of ['active','inactive']){const r=await run(action,{role:'municipal_admin',status});assert.ok(r.result.success);assert.equal(r.filters.prefeitura_id,'company');assert.equal(r.payload.status,status)}
  assert.ok((await run(action,{missing:true})).result.error);
 }
 console.log('PASS: Master-only deletion, linked records, database errors, status validation and company isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
