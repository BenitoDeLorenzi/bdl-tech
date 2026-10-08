const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, deps) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{assert.ok(name in deps,name);return deps[name];}});
 return exports;
}
async function maintenance({ workshopCompany='company', active=true, selected='workshop', editing=false, legacy=false }={}) {
 let payload;
 const db={from(table){
  const filters={};let writing=false;
  const q={select(){return q;},eq(k,v){filters[k]=v;return q;},insert(p){payload=p;writing=true;return q;},update(p){payload=p;writing=true;return q;},
   async single(){if(writing)return {error:{message:'captured'}};return {data:table==='frota_veiculos'?{id:'vehicle',prefeitura_id:'company'}:{id:'maintenance',prefeitura_id:'company',veiculo_id:'vehicle',oficina_id:legacy?null:'previous',oficina:legacy?'Historical name':'Previous name'}};},
   async maybeSingle(){assert.equal(table,'frota_oficinas');assert.equal(filters.prefeitura_id,'company');assert.equal(filters.status,'active');return {data:workshopCompany===filters.prefeitura_id&&active?{id:selected,nome:'Registered workshop'}:null};},
   then(resolve){return Promise.resolve({error:{message:'captured'}}).then(resolve);}
  };return q;
 }};
 const actions=load('src/app/frotas/actions.ts',{
  crypto:require('node:crypto'),'next/cache':{},'next/navigation':{},
  '@/lib/auth-data':{requireUserProfile:async()=>({role:'municipal_user',prefeitura_id:'company'})},
  '@/lib/frotas-permissions':{hasFrotasPermission:async()=>true},'@/lib/posto-auth':{},'@/lib/supabase-server':{createSupabaseServerClient:()=>db}
 });
 const form=new FormData();for(const [k,v]of Object.entries({id:'maintenance',veiculo_id:'vehicle',tipo:'Revisao',descricao:'Service',data_entrada:'2026-10-08',oficina_id:selected,oficina:'Forged name'}))form.set(k,v);
 const result=await actions[editing?'updateManutencao':'createManutencao']({},form);
 return {payload,result};
}
async function save({permission=true,id='',company='company',role='municipal_user',duplicate=false}={}) {
 let payload;const filters={};
 const q={insert(p){payload=p;return q;},update(p){payload=p;return q;},eq(k,v){filters[k]=v;return q;},select(){return q;},async maybeSingle(){return duplicate?{error:{code:'23505'}}:{data:{id:'workshop'}};}};
 const actions=load('src/app/frotas/oficinas/actions.ts',{
 'next/cache':{revalidatePath(){}},'@/lib/auth-data':{requireUserProfile:async()=>({role,prefeitura_id:'company'})},
 '@/lib/frotas-permissions':{hasFrotasPermission:async()=>permission},'@/lib/frotas-data':{getFrotasData:async({prefeituraId})=>({selectedPrefeituraId:prefeituraId})},
 '@/lib/supabase-server':{createSupabaseServerClient:()=>({from:()=>q})}});
 const form=new FormData();for(const [k,v]of Object.entries({id,prefeitura_id:company,nome:'Workshop',status:'inactive',documento:'',responsavel:'Contact'}))form.set(k,v);
 return {result:await actions.saveOficina({},form),payload,filters};
}
(async()=>{
 const blocked=await maintenance({editing:true});assert.ok(blocked.result.error);assert.equal(blocked.payload,undefined);
 const created=await maintenance();assert.equal(created.payload.oficina_id,'workshop');assert.equal(created.payload.oficina,'Registered workshop');
 for(const config of [{workshopCompany:'other'},{active:false},{selected:''}]){const rejected=await maintenance(config);assert.ok(rejected.result.error);assert.equal(rejected.payload,undefined);}
 const denied=await save({permission:false});assert.ok(denied.result.error);assert.equal(denied.payload,undefined);
 const scoped=await save({id:'workshop',company:'forged'});assert.equal(scoped.payload.prefeitura_id,'company');assert.equal(scoped.filters.prefeitura_id,'company');assert.equal(scoped.filters.id,'workshop');assert.equal(scoped.payload.status,'inactive');
 assert.ok((await save({duplicate:true})).result.error);
 console.log('PASS: workshop selection, authoritative name, tenant and inactive rejection, maintenance editing blocked, workshop CRUD authorization, company scope and duplicates.');
})().catch(error=>{console.error(error);process.exitCode=1;});
