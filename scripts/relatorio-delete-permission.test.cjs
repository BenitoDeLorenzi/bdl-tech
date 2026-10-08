const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function run(role,allowed=true){
 let deleted=false;const redirects=[];
 const q={delete(){deleted=true;return q},eq(){return Promise.resolve({error:null})}};
 const deps={'next/cache':{revalidatePath(){}},'next/navigation':{redirect:url=>{redirects.push(decodeURIComponent(url));throw Error('REDIRECT')}},'@/lib/auth-data':{requireUserProfile:async()=>({role})},'@/lib/frotas-permissions':{hasFrotasPermission:async()=>allowed},'@/lib/relatorios-data':{},'@/lib/supabase-server':{createSupabaseServerClient:()=>({from:()=>q})}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/relatorios/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n]});
 const form=new FormData();form.set('id','report');await assert.rejects(()=>exports.deleteRelatorio(form),/REDIRECT/);return {deleted,redirects};
}
(async()=>{
 for(const role of ['municipal_admin','municipal_user']){const r=await run(role);assert.equal(r.deleted,false);assert.match(r.redirects[0],/Master/)}
 assert.equal((await run('bdl_admin',false)).deleted,false);
 const r=await run('bdl_admin');assert.equal(r.deleted,true);assert.match(r.redirects[0],/deleted=1/);
 console.log('PASS: reports can only be deleted by Master with module permission.');
})().catch(e=>{console.error(e);process.exitCode=1});
