import { getProjetoAtual } from "@/lib/projeto";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { projeto, sessao } = await getProjetoAtual();

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar nomeProjeto={projeto.nome} nomeUsuario={sessao.name} />
      <main className="flex-1 overflow-x-hidden bg-background px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
