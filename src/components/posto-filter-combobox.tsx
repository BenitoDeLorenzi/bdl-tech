"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  PostoCombobox,
  type PostoComboboxOption,
} from "@/components/posto-combobox";

type PostoFilterComboboxProps = {
  className?: string;
  postos: PostoComboboxOption[];
  selectedPostoId?: string | null;
};

export function PostoFilterCombobox({
  className,
  postos,
  selectedPostoId,
}: PostoFilterComboboxProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updatePosto(postoId: string | null) {
    const query = new URLSearchParams(searchParams.toString());

    if (postoId) {
      query.set("posto", postoId);
    } else {
      query.delete("posto");
    }

    const queryString = query.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  }

  return (
    <div className={className}>
      <PostoCombobox
        id="posto_filter"
        value={selectedPostoId ?? null}
        onChange={updatePosto}
        postos={postos}
        placeholder="Pesquisar posto"
      />
    </div>
  );
}
