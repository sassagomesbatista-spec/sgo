"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  // Lido apenas no mount para refletir o tema já aplicado pelo script inline do
  // layout (evita divergir do HTML gerado no servidor, que não tem acesso a
  // document/matchMedia) — por isso a leitura do tema atual é feita em efeito.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const atual = document.documentElement.getAttribute("data-theme");
    if (atual === "dark") setTema("dark");
    else if (atual === "light") setTema("light");
    else setTema(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    document.documentElement.setAttribute("data-theme", novo);
    localStorage.setItem("theme", novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar tema claro/escuro"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-accent hover:text-accent"
    >
      {tema === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
