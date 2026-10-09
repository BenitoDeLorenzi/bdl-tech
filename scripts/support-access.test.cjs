const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
function load(path, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,
    {exports,require:key=>dependencies[key],URL,URLSearchParams,Request,Response,FormData,File,Buffer,crypto:require('node:crypto').webcrypto});
  return exports;
}
const ticketId='00000000-0000-4000-a000-000000000001';
const requestId='00000000-0000-4000-a000-000000000002';
async function testScope(role, params, module=true) {
  const filters={};
  const query={select:()=>query,eq:(k,v)=>{filters[k]=v;return query;},maybeSingle:async()=>({data:{id:ticketId}})};
  const lib=load('src/lib/suporte.ts',{
    'server-only':{},
    '@/lib/auth-data':{getCurrentUserProfile:async()=>role?{id:'user',role,prefeitura_id:'own'}:null},
    '@/lib/empresa-access':{hasModuleAccess:async()=>module,getModuleLicensedEmpresas:async()=>[{id:'own'},{id:'other'}]},
    '@/lib/supabase-server':{createSupabaseServerClient:()=>({from:()=>query})},
  });
  const scope=await lib.getSupportScope(new URLSearchParams(params));
  if(scope) await lib.getSupportTicket(scope,ticketId);
  return {scope,filters};
}
async function testSend(options={}) {
  const uploaded=[],removed=[];let args;
  const scope={profile:{id:'session-user',nome:'Autor',role:'municipal_user'},master:false,empresa:'own'};
  const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:null}),single:async()=>({data:{anexos:uploaded.map(path=>({path}))}})};
  const route=load('src/app/api/suporte/route.ts',{
    sharp,
    '@/lib/suporte':{
      getSupportScope:async()=>options.denied?null:scope,
      getSupportTicket:async()=>options.missing?null:{id:ticketId,assunto:'Ajuda',status:options.resolved?'resolved':'waiting'},
      isUuid:value=>/^[0-9a-f-]{36}$/.test(value),supportBucket:'suporte-anexos',
      supportRpcScope:s=>({p_usuario:s.profile.id,p_master:s.master,p_empresa:s.empresa}),
    },
    '@/lib/supabase-server':{createSupabaseServerClient:()=>({from:()=>query,rpc:async(_,payload)=>{args=payload;return options.dbError?{error:{message:'internal'}}:{data:1}},storage:{from:()=>({upload:async(path,image)=>{assert.equal((await sharp(image).metadata()).format,'webp');uploaded.push(path);return {}},remove:async paths=>{removed.push(...paths);return {}}})}})},
  });
  const form=new FormData();
  form.set('conversa',ticketId);form.set('request_id',requestId);form.set('assunto','Ajuda');form.set('texto','Teste');form.set('autor_id','forged');form.set('master','true');
  if(options.image) form.append('imagens',new File([options.image],'test.png',{type:'image/png'}));
  const result=await route.POST(new Request('http://localhost/api/suporte?empresa=own',{method:'POST',headers:{origin:options.cross?'https://external.test':'http://localhost'},body:form}));
  return {result,args,uploaded,removed};
}
(async()=>{
  assert.equal((await testScope(null,'')).scope,null);
  assert.equal((await testScope('municipal_admin','mode=master')).scope,null);
  assert.equal((await testScope('municipal_user','empresa=other')).scope,null);
  assert.equal((await testScope('municipal_user','empresa=own',false)).scope,null);
  assert.equal((await testScope('bdl_admin','empresa=unlicensed')).scope,null);
  const own=await testScope('municipal_admin','empresa=own');assert.equal(own.filters.usuario_id,'user');assert.equal(own.filters.empresa_id,'own');
  const master=await testScope('bdl_admin','mode=master');assert.ok(master.scope.master);assert.equal(master.filters.usuario_id,undefined);
  assert.equal((await testSend({cross:true})).result.status,403);
  assert.equal((await testSend({denied:true})).result.status,403);
  assert.equal((await testSend({missing:true})).result.status,404);
  assert.equal((await testSend({resolved:true})).result.status,409);
  const image=await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).png().toBuffer();
  const success=await testSend({image});assert.equal(success.result.status,200);assert.equal(success.args.p_usuario,'session-user');assert.equal(success.args.p_master,false);assert.equal(success.uploaded.length,1);assert.equal(success.removed.length,0);
  const failure=await testSend({image,dbError:true});assert.equal(failure.result.status,409);assert.equal(failure.removed.length,1);
  const invalid=await testSend({image:Buffer.from('<svg>not an image</svg>')});assert.notEqual(invalid.result.status,200);assert.equal(invalid.uploaded.length,0);
  console.log('PASS: support role/module/license/company/owner access, CSRF, closed tickets, session-owned attribution, image validation/re-encoding and failed-upload cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1});
