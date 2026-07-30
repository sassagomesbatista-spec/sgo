"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/app/(app)/actions";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
      {NAV_ITEMS.map((item) => {
        const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              ativo
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            <Icon size={17} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ nomeProjeto, nomeUsuario }: { nomeProjeto: string; nomeUsuario: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <span className="text-sm font-semibold">Painel da Reforma</span>
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setAberto(true)}
          className="rounded-md border border-border p-2"
        >
          <Menu size={18} />
        </button>
      </header>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border px-5 py-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Painel da Reforma</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{nomeProjeto}</p>
        </div>
        <NavLinks />
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{nomeUsuario}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                aria-label="Sair"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-danger hover:text-danger"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {aberto && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-72 flex-col border-r border-border bg-surface flex">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <p className="text-sm font-semibold">{nomeProjeto}</p>
              <button type="button" aria-label="Fechar menu" onClick={() => setAberto(false)}>
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={() => setAberto(false)} />
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <ThemeToggle />
              <form action={logout}>
                <button type="submit" className="text-sm text-danger">
                  Sair
                </button>
              </form>
            </div>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setAberto(false)} />
        </div>
      )}
    </>
  );
}
