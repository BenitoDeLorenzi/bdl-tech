const fs = require('fs');
const path='src/app/gestao/fechamentos/fechamento-form.tsx';
let s=fs.readFileSync(path,'utf8').replaceAll('\r\n','\n');
s=s.replace('  Plus,','  Plus,\n  ChevronDown,');
s=s.replace('  formasPagamento,\n','');
s=s.replace('import { entryCostTotal }', 'import { produtosDoFechamento, recebimentosIniciais, recebimentoLiquido } from "@/lib/gestao-fechamento";\nimport { entryCostTotal }');
s=s.replace('pagamentos: { forma: string; origem: string; valor: string }[];','pagamentos: { forma: string; origem: string; valor: string; taxa_percentual: string }[];\n  despesas: { descricao: string; valor: string }[];');
s=s.replaceAll('fechamento ? 3 : 0','fechamento ? 4 : 0');
s=s.replace('const etapas = ["Identificação", "Produtos", "Recebimentos", "Observações"];','const etapas = ["Identificação", "Produtos", "Recebimentos", "Despesas", "Observações"];\n  const catalogo = produtosDoFechamento(produtos, fechamento);\n  const categorias = [...new Set(catalogo.map((p) => p.categoria))];\n  const [abertas, setAbertas] = useState<string[]>(categorias.slice(0, 1));');
let a=s.indexOf('      itens: fechamento?.itens.map');let b=s.indexOf('\n    },\n  });',a);
s=s.slice(0,a)+`      itens: catalogo.map((p) => {
        const salvo = fechamento?.itens.find((i) => i.produto_id === p.id);
        return {
          produto_id: p.id,
          quantidade: salvo ? String(salvo.quantidade) : "",
          preco_unitario: salvo ? String(salvo.preco_unitario ?? (Number(salvo.total) / Number(salvo.quantidade)).toFixed(2)) : p.preco == null ? "" : String(p.preco),
          total: salvo ? String(salvo.total) : "",
        };
      }),
      pagamentos: recebimentosIniciais(fechamento),
      despesas: (fechamento?.despesas ?? []).map((d) => ({ descricao: d.descricao, valor: String(d.valor) })),`+s.slice(b);
a=s.indexOf('  const itensArray =');b=s.indexOf('  const itens = useWatch',a);
s=s.slice(0,a)+`  const despesasArray = useFieldArray({ control: form.control, name: "despesas" });
  const despesas = useWatch({ control: form.control, name: "despesas" });
`+s.slice(b);
s=s.replace('const total = itens.reduce((s, i) => s + cents(i.total), 0);','const total = itens.reduce((s, i) => s + (Number(i.quantidade) > 0 ? cents(i.total) : 0), 0);\n  const taxas = pagamentos.reduce((s, p) => s + recebimentoLiquido(Number(p.valor || 0), Number(p.taxa_percentual.replace(",", ".") || 0)).taxa, 0);\n  const totalDespesas = despesas.reduce((s, d) => s + cents(d.valor), 0);');
s=s.replace('itens: values.itens.map','itens: values.itens.filter((i) => Number(i.quantidade) > 0).map');
s=s.replace('valor: Number(p.valor),','valor: Number(p.valor),\n            taxa_percentual: Number(p.taxa_percentual.replace(",", ".") || 0),');
s=s.replace('      });\n      if (result.error)', '        despesas: values.despesas.map((d) => ({ descricao: d.descricao.trim(), valor: Number(d.valor) })),\n      });\n      if (result.error)');
s=s.replace('          : await form.trigger("pagamentos"));','          : etapa === 2 ? await form.trigger("pagamentos") : await form.trigger("despesas"));\n    if (etapa === 1 && !valid) setAbertas(categorias);\n    if (etapa === 1 && !validarProdutos()) return;');
// Validate membership separately, while each mounted row validates its fields only after Continue.
a=s.indexOf('  async function salvar');
s=s.slice(0,a)+`  function validarProdutos() {
    const selecionados = form.getValues("itens").filter((i) => Number(i.quantidade) > 0);
    if (selecionados.length < 1 || selecionados.length > 500) {
      form.setError("itens.root", { message: "Informe a quantidade vendida de 1 a 500 produtos." });
      return false;
    }
    form.clearErrors("itens.root");
    return true;
  }
`+s.slice(a);
s=s.replace('    form.clearErrors("root");\n    try {','    form.clearErrors("root");\n    if (!validarProdutos()) { setEtapa(1); return; }\n    try {');
s=s.replaceAll('etapa < 3','etapa < 4').replaceAll('etapa === 3','etapa === 4');
s=s.replace('else if (e.itens) setEtapa(1);','else if (e.itens) { setEtapa(1); setAbertas(categorias); }');
s=s.replace('else if (e.observacoes) setEtapa(3);','else if (e.despesas) setEtapa(3);\n            else if (e.observacoes) setEtapa(4);');
s=s.replace('grid grid-cols-4 gap-2 border-b','grid grid-cols-5 gap-1 border-b').replace('Etapa {etapa + 1} de 4','Etapa {etapa + 1} de 5');
a=s.indexOf('        <section hidden={etapa !== 1}');b=s.indexOf('        <section hidden={etapa !== 3}',a);
const sections=fs.readFileSync('supabase/.temp/closing-sections.txt','utf8');
s=s.slice(0,a)+sections+s.slice(b).replace('hidden={etapa !== 3}','hidden={etapa !== 4}');
s=s.replace('          <FieldError errors={[errors.root]} />',`          {etapa === 4 && <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Taxas</span><strong className="block tabular-nums">{dinheiro(taxas / 100)}</strong></div>
            <div><span className="text-xs text-muted-foreground">Despesas</span><strong className="block tabular-nums">{dinheiro(totalDespesas / 100)}</strong></div>
            <div><span className="text-xs text-muted-foreground">Saldo após descontos</span><strong className="block tabular-nums">{dinheiro((recebido - taxas - totalDespesas) / 100)}</strong></div>
          </div>}
          <FieldError errors={[errors.root]} />`);
fs.writeFileSync(path,s);
