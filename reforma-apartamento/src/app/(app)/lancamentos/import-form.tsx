"use client";

import { useActionState } from "react";
import { importarCsv } from "./actions";
import { SubmitButton } from "@/components/ui/form";

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importarCsv, null);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-3" encType="multipart/form-data">
      <input type="file" name="arquivo" accept=".csv" required className="text-sm text-muted-foreground" />
      <SubmitButton disabled={pending}>{pending ? "Importando..." : "Importar"}</SubmitButton>
      {state?.mensagem && <span className="text-sm text-success">{state.mensagem}</span>}
      {state?.erro && <span className="text-sm text-danger">{state.erro}</span>}
    </form>
  );
}
