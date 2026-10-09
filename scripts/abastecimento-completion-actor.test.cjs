const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function run(source, options={}) {
 let payload; let profileReads=0, stationReads=0;
 const order={id:'order',prefeitura_id:options.foreignCompany?'other':'company',posto_id:options.foreignStation?'other':'station',status:'issued',veiculo_id:'vehicle',expires_at:'2099-01-01',arla_incluso:false};
 const db={from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:order}),single:async()=>({data:table==='frota_veiculos'?{id:'vehicle',quilometragem:10}:order}),update(data){if(table==='frota_abastecimentos')payload=data;return q},then(resolve){return Promise.resolve({error:null}).then(resolve)}};return q}};
 const deps={'crypto':require('node:crypto'),'next/cache':{revalidatePath(){}},'next/navigation':{},'@/lib/auth-data':{getCurrentUserProfile:async()=>{profileReads++;return options.noUser?null:{id:'user',nome:'Admin',role:'municipal_admin',prefeitura_id:'company'}}},'@/lib/posto-auth':{getPostoSession:async()=>{stationReads++;return options.noStation?null:{id:'station',nome:'Posto correto',prefeitura_id:'company'}}},'@/lib/frotas-permissions':{hasFrotasPermission:async()=>true},'@/lib/supabase-server':{createSupabaseServerClient:()=>db}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/frotas/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:n=>deps[n],File});
 const form=new FormData();for(const [k,v] of Object.entries({id:'order',quilometragem:'10',litros:'10',valor_litro:'5,00',valor_total:'50,00',concluido_por:'Atendente',atividade_usuario_id:'spoof',atividade_por:'spoof'}))form.set(k,v);
 const result=await exports[source==='posto'?'completeAbastecimentoPosto':'completeAbastecimento']({},form);
 return {result,payload,profileReads,stationReads};
}
(async()=>{
 const station=await run('posto');assert.ok(station.result.success);assert.equal(station.payload.atividade_por,'Posto correto');assert.equal(station.payload.atividade_usuario_id,null);assert.equal(station.profileReads,0);
 const admin=await run('admin');assert.ok(admin.result.success);assert.equal(admin.payload.atividade_por,'Admin');assert.equal(admin.payload.atividade_usuario_id,'user');assert.equal(admin.stationReads,0);
 for(const [source,options] of [['posto',{noStation:true}],['posto',{foreignStation:true}],['posto',{foreignCompany:true}],['admin',{noUser:true}],['admin',{foreignCompany:true}]]){const result=await run(source,options);assert.ok(result.result.error);assert.equal(result.payload,undefined);}
 console.log('PASS: both active logins, source-specific actor, no identity fallback, forged actor ignored and company/station isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
