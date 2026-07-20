"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground text-lg font-semibold">
            R
          </div>
          <h1 className="text-xl font-semibold text-foreground">Painel da Reforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre para acompanhar orçamento, cronograma e documentos.
          </p>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              placeholder="voce@exemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="senha" className="text-sm font-medium text-foreground">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {state?.erro && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
              {state.erro}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>

          <p className="pt-1 text-center text-xs text-muted-foreground">
            Acesso demo: demo@reforma.local / reforma123
          </p>
        </form>
      </div>
    </main>
  );
}
