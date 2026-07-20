"use client";

import { Trash2 } from "lucide-react";

export function ConfirmDeleteButton({
  action,
  confirmMessage = "Tem certeza que deseja excluir este registro?",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        aria-label="Excluir"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-danger-bg hover:text-danger"
      >
        <Trash2 size={15} />
      </button>
    </form>
  );
}
