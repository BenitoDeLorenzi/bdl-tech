import { redirect } from "next/navigation";
export default function PerfilPage() {
  redirect("/portal?perfil=1");
}
