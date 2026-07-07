import Link from 'next/link';
import { logoutAction } from '@/app/actions';

export default function Nav({ session }) {
  const isAdmin = session.role === 'admin';
  return (
    <header className="nav">
      <div className="nav-brand">Pilotagem</div>
      <nav className="nav-links">
        {isAdmin && (
          <Link href="/dashboard" prefetch={false}>
            Painel
          </Link>
        )}
        <Link href="/lancar" prefetch={false}>
          Lançar Peça
        </Link>
        <Link href="/lancamentos" prefetch={false}>
          Lançamentos
        </Link>
        {isAdmin && (
          <Link href="/pilotistas" prefetch={false}>
            Pilotistas
          </Link>
        )}
        {isAdmin && (
          <Link href="/precos" prefetch={false}>
            Preços
          </Link>
        )}
        {isAdmin && (
          <Link href="/relatorio" prefetch={false}>
            Relatório
          </Link>
        )}
        <Link href="/conta" prefetch={false}>
          Conta
        </Link>
      </nav>
      <form action={logoutAction}>
        <button className="btn-link" type="submit">
          Sair
        </button>
      </form>
    </header>
  );
}
