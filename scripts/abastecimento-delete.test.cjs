const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
async function run(role,status,dbError=false){
 let deleted=false;const filters={};const paths=[];
 const q={delete(){return q;},eq(k,v){filters[k]=v;return q;},select(){return q;},async maybeSingle(){assert.equal(filters.id,'order');assert.equal(filters.status,'cancelled');deleted=status===filters.status&&!dbError;return dbError?{error:{message:'failed'}}:{data:deleted?{id:'order',veiculo_id:'vehicle'}:null};}};
 const deps={'next/cache':{revalidatePath:p=>paths.push(p)},'@/lib/auth-data':{requireUserProfile:async()=>({role})},'@/lib/frotas-permissions':{hasFrotasPermission:async()=>true},'@/lib/supabase-server':{createSupabaseServerClient:()=>({from:t=>{assert.equal(t,'frota_abastecimentos');return q;}})}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/abastecimento/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n]});
 const form=new FormData();form.set('id','order');return {result:await exports.deleteAbastecimento({},form),deleted,paths};
}
(async()=>{
 for(const role of ['municipal_admin','municipal_user']){const r=await run(role,'cancelled');assert.ok(r.result.error);assert.equal(r.deleted,false);}
 for(const status of ['issued','completed','expired',null]){const r=await run('bdl_admin',status);assert.ok(r.result.error);assert.equal(r.deleted,false);}
 const success=await run('bdl_admin','cancelled');assert.ok(success.result.success);assert.equal(success.deleted,true);assert.ok(success.paths.includes('/frotas/veiculos/vehicle'));
 assert.ok((await run('bdl_admin','cancelled',true)).result.error);
 console.log('PASS: Master only, cancelled only, status enforced in DELETE, errors and revalidation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
