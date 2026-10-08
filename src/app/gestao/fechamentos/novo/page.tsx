import { redirect } from "next/navigation";
export default function NovoFechamentoPage() {
  redirect("/gestao/fechamentos?novo=1");
}
