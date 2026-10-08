import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../src/lib/gestao-contas.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {resumoContas,pendentePagar,valorReservado}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const data={inicio:'2026-09-24',contas:[{tipo:'caixa',saldo:100.10},{tipo:'banco',saldo:200.20},{tipo:'cobranca',saldo:999}],pagar:[
 {valor:100,pago:40,vencimento:'2026-09-23'},
 {valor:80,pago:0,vencimento:'2026-10-01'},
 {valor:999,pago:0,vencimento:'2026-10-02'},
 {valor:555,pago:0,vencimento:'2026-09-24',cancelada:true},
],solicitacoes:[{status:'pendente',valor:200.10,conta_id:'s1',pagar_id:'p1'},{status:'pendente',valor:100.20,conta_id:'s2'},...['concluida','cancelada','estornada'].map(status=>({status,valor:500,conta_id:'s1',pagar_id:'p1'}))]};
assert.deepEqual(resumoContas(data,'2026-09-24'),{disponivel:300.3,retido:999,reservado:300.3,livre:698.7,pagar7:140});
assert.equal(pendentePagar({valor:0.30,pago:0.10}),0.20);
assert.equal(valorReservado(data.solicitacoes,'s1'),200.10);
assert.equal(valorReservado(data.solicitacoes,undefined,'p1'),200.10);
assert.deepEqual(resumoContas({contas:[],pagar:[],solicitacoes:[]},'2026-09-24'),{disponivel:0,retido:0,reservado:0,livre:0,pagar7:0});
console.log('PASS: provider separate from bank, only pending requests reserve, account/payable reservations, overdue and seven-day cutoff, cent arithmetic.');
