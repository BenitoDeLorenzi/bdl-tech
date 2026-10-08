import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const url = (source) =>
  "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const typesUrl = url(compile("../src/lib/gestao-types.ts"));
const feesUrl = url(
  compile("../src/lib/gestao-fechamento.ts").replace(
    '"./gestao-types"',
    JSON.stringify(typesUrl),
  ),
);
const { resumirFinanceiro } = await import(
  url(
    compile("../src/lib/gestao-financeiro.ts").replace(
      '"./gestao-fechamento"',
      JSON.stringify(feesUrl),
    ),
  )
);
const closing = (data, valor, extra = {}) => ({
  data,
  status: "conferido",
  pagamentos: [{ valor, taxa_percentual: 2.5 }],
  despesas: [],
  ...extra,
});
const entry = (data, tipo, valor, extra = {}) => ({
  data,
  tipo,
  valor,
  colaborador_id: "a",
  estornado: false,
  ...extra,
});
const rows = [
  closing("2026-08-01", 1000),
  closing("2026-09-23", 200, {
    despesas: [{ valor: 10 }],
    equipe: [{ valor_pago: 50 }],
  }),
  closing("2026-09-23", 900, { status: "rascunho" }),
  closing("2026-10-01", 1000),
];
const ledger = [
  entry("2026-08-01", "trabalho", 100),
  entry("2026-08-02", "pagamento", 20, { legado_id: "legacy" }),
  entry("2026-09-23", "pagamento", 50),
  entry("2026-09-23", "pagamento", 999, { estornado: true }),
  entry("2026-10-01", "trabalho", 999),
];
const result = resumirFinanceiro(rows, ledger, "2026-09-01", "2026-09-23");
assert.deepEqual(result.periodo, {
  bruto: 20000,
  taxas: 500,
  despesas: 1000,
  equipePaga: 5000,
  liquido: 19500,
  saidas: 6500,
  saldo: 13500,
});
assert.equal(result.acumulado.saldo, 109000);
assert.equal(result.equipePendente, 3000);
assert.equal(result.aposQuitarEquipe, 106000);
assert.equal(result.colaboradoresPendentes, 1);
assert.equal(
  resumirFinanceiro(rows, ledger, "2026-09-23", "2026-09-23").acumulado.saldo,
  result.acumulado.saldo,
);
assert.equal(
  resumirFinanceiro(
    [
      closing("2026-09-23", 0.05, {
        pagamentos: [{ valor: 0.05, taxa_percentual: 10 }],
      }),
    ],
    [],
    "2026-09-01",
    "2026-09-23",
  ).periodo.taxas,
  1,
);
assert.equal(
  resumirFinanceiro([], [], "2026-09-01", "2026-09-23").aposQuitarEquipe,
  0,
);
assert.equal(
  resumirFinanceiro(
    [closing("2026-09-23", 0, { despesas: [{ valor: 20 }] })],
    [],
    "2026-09-01",
    "2026-09-23",
  ).periodo.saldo,
  -2000,
);
console.log(
  "PASS: period and accumulated balance, drafts/future/reversals excluded, legacy payments included once, old debt settlement, fees rounded per receipt, empty/negative balances.",
);
