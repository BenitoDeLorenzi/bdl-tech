const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function setup(scope){
  const events=[];let subscriber,removed=false;
  const channel={on(kind,filter,cb){events.push({filter,cb});return channel},subscribe(cb){subscriber=cb;return channel}};
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/suporte/realtime/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,require:name=>({'@/lib/suporte':{getSupportScope:async()=>scope},'@/lib/supabase-server':{createSupabaseServerClient:()=>({channel:()=>channel,removeChannel:async()=>{removed=true}})}})[name],URL,Response,ReadableStream,TextEncoder,crypto:require('node:crypto').webcrypto,setInterval,clearInterval,setTimeout,clearTimeout,
  });
  return {response:await exports.GET(new Request('http://localhost/api/suporte/realtime')),events,status:state=>subscriber(state),removed:()=>removed};
}
const decode=result=>new TextDecoder().decode(result.value);
(async()=>{
  assert.equal((await setup(null)).response.status,403);
  for(const master of [false,true]){
    const state=await setup({profile:{id:'user'},empresa:master?null:'company',master});
    const reader=state.response.body.getReader();
    assert.equal(state.events[0].filter.filter,master?undefined:'usuario_id=eq.user');
    state.events[1].cb({new:{usuario_id:'another'}});
    if(!master){
      state.events[0].cb({new:{usuario_id:'another',empresa_id:'company'}});
      state.events[0].cb({new:{usuario_id:'user',empresa_id:'other'}});
    }
    state.status('SUBSCRIBED');assert.equal(decode(await reader.read()),'event: ready\ndata: {}\n\n');
    state.events[0].cb({new:{usuario_id:'user',empresa_id:'company',private_text:'not exposed'}});
    assert.equal(decode(await reader.read()),'event: changed\ndata: {}\n\n');
    await reader.cancel();state.status('CHANNEL_ERROR');assert.equal(state.removed(),true);
  }
  console.log('PASS: support realtime auth, master/user scopes, company and owner isolation, payload-free invalidation and cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1});
