const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function setup(session){
 const events=[];let subscriber,removed=false;
 const channel={on(kind,filter,cb){events.push({kind,filter,cb});return channel},subscribe(cb){subscriber=cb;return channel}};
 const exports={};const deps={'@/lib/frotas-notificacoes':{getNotificationScope:async()=>session},'@/lib/supabase-server':{createSupabaseServerClient:()=>({channel:()=>channel,removeChannel:async()=>{removed=true}})}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/notificacoes/realtime/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n],URL,Response,ReadableStream,TextEncoder,crypto:require('node:crypto').webcrypto,process:{env:{SUPABASE_SERVICE_ROLE_KEY:'test'}},setInterval,clearInterval,setTimeout,clearTimeout});
 const response=await exports.GET(new Request('http://localhost/frotas/notificacoes/realtime?empresa=other'));
 return {response,events,ready:()=>subscriber('SUBSCRIBED'),removed:()=>removed};
}
(async()=>{
 assert.equal((await setup(null)).response.status,401);
 const s=await setup({usuarioId:'user',empresaId:'company',tipos:['manutencao','uso_veiculo']});assert.equal(s.events.length,2);assert.equal(s.events[0].filter.filter,'prefeitura_id=eq.company');assert.equal(s.events[1].filter.filter,'usuario_id=eq.user');
 const reader=s.response.body.getReader();s.ready();assert.match(new TextDecoder().decode((await reader.read()).value),/event: ready/);
 s.events[0].cb({new:{prefeitura_id:'other',secret:'not exposed'}});
 s.events[1].cb({new:{usuario_id:'other'}});
 s.events[0].cb({new:{prefeitura_id:'company',tipo:'abastecimento',secret:'not exposed'}});
 s.events[0].cb({new:{prefeitura_id:'company',tipo:'manutencao',secret:'not exposed'}});
 assert.equal(new TextDecoder().decode((await reader.read()).value),'event: changed\ndata: {}\n\n');
 s.events[0].cb({new:{prefeitura_id:'company',tipo:'uso_veiculo'}});
 assert.equal(new TextDecoder().decode((await reader.read()).value),'event: changed\ndata: {}\n\n');
 await reader.cancel();assert.equal(s.removed(),true);
 console.log('PASS: user authentication, company/user scope, notification events, no record payload and subscription cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});

