const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function setup(session){
 const events=[];let subscriber,removed=false;
 const channel={on(kind,filter,cb){events.push({kind,filter,cb});return channel},subscribe(cb){subscriber=cb;return channel}};
 const exports={};const deps={'@/lib/posto-auth':{getPostoSession:async()=>session},'@/lib/supabase-server':{createSupabaseServerClient:()=>({channel:()=>channel,removeChannel:async()=>{removed=true}})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/posto/realtime/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n],Response,ReadableStream,TextEncoder,crypto:require('node:crypto').webcrypto,process:{env:{SUPABASE_SERVICE_ROLE_KEY:'test'}},setInterval,clearInterval,setTimeout,clearTimeout});
 const response=await exports.GET(new Request('http://localhost/frotas/posto/realtime?posto_id=other'));
 return {response,events,ready:()=>subscriber('SUBSCRIBED'),removed:()=>removed};
}
(async()=>{
 assert.equal((await setup(null)).response.status,401);
 const s=await setup({id:'station',prefeitura_id:'company'});assert.equal(s.events.length,2);assert.ok(s.events.every(e=>e.filter.filter==='posto_id=eq.station'));
 const reader=s.response.body.getReader();s.ready();assert.match(new TextDecoder().decode((await reader.read()).value),/event: ready/);
 s.events[0].cb({new:{posto_id:'other',prefeitura_id:'company',secret:'not exposed'}});
 s.events[0].cb({new:{posto_id:'station',prefeitura_id:'other'}});
 s.events[1].cb({new:{posto_id:'station',prefeitura_id:'company',secret:'not exposed'}});
 assert.equal(new TextDecoder().decode((await reader.read()).value),'event: changed\ndata: {}\n\n');
 await reader.cancel();assert.equal(s.removed(),true);
 console.log('PASS: station authentication, server-derived scope, insert/update events, no record payload and subscription cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
