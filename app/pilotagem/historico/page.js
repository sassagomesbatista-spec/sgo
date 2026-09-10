import Link from 'next/link';
import db from '@/lib/db';
import { getSession, homeFor } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { historicoPilotista } from '@/lib/status';
import { corEficiencia } from '@/lib/eficiencia';
import Icon from '@/app/icons';

function fmtDia(dataStr) {
  const d = new Date(`${dataStr}T00:00:00Z`);
  const label = d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });
  return label.replace('.', '');
}

export default function HistoricoPage({ searchParams }) {
  const session = getSession();
  // Cada pilotista só enxerga a própria; a equipe do escritório (admin)
  // pode abrir a de qualquer uma passando ?pilotista=<id> — útil pra
  // acompanhar a evolução sem precisar pedir o celular dela.
  if (session.role !== 'pilotista' && session.role !== 'admin') {
    redirect(homeFor(session.role));
  }

  let pilotistaId = session.pilotista_id;
  let pilotistaNome = session.nome;
  const voltarHref = session.role === 'admin' ? '/dashboard' : '/pilotagem';

  if (session.role === 'admin') {
    pilotistaId = Number(searchParams?.pilotista);
    if (!pilotistaId) redirect('/dashboard');
    const p = db.prepare('SELECT nome FROM pilotistas WHERE id = ?').get(pilotistaId);
    if (!p) redirect('/dashboard');
    pilotistaNome = p.nome;
  }

  const { dias, ultimos7dias } = historicoPilotista(pilotistaId, 30);

  return (
    <div>
      <p className="subtitle" style={{ marginBottom: 4 }}>
        <Link href={voltarHref}>← Voltar</Link>
      </p>
      <h1>
        <span className="card-icon">
          <Icon name="clock" />
        </span>
        Histórico{session.role === 'admin' ? ` — ${pilotistaNome}` : ''}
      </h1>
      <p className="subtitle">Peças, valor e eficiência dia a dia (últimos 30 dias)</p>

      <div className="stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-label">Eficiência média (7 dias)</span>
          <span className={`stat-value ${corEficiencia(ultimos7dias.mediaEficienciaPct)}`}>
            {ultimos7dias.mediaEficienciaPct != null ? `${ultimos7dias.mediaEficienciaPct}%` : '—'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peças (7 dias)</span>
          <span className="stat-value">{ultimos7dias.pecas}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Valor (7 dias)</span>
          <span className="stat-value">R$ {ultimos7dias.valor.toFixed(2)}</span>
        </div>
      </div>

      <div className="card">
        <div className="form-section-label" style={{ marginBottom: 10 }}>
          Últimos 30 dias
        </div>
        <div className="historico-lista">
          {dias.map((d) => (
            <div key={d.data} className="historico-linha">
              <span className="historico-data">{fmtDia(d.data)}</span>
              <div className="historico-barra-wrap">
                <div
                  className={`historico-barra ${corEficiencia(d.eficienciaPct)}`}
                  style={{ width: d.eficienciaPct != null ? `${Math.min(100, d.eficienciaPct)}%` : '0%' }}
                />
              </div>
              <span className={`historico-pct ${corEficiencia(d.eficienciaPct)}`}>
                {d.eficienciaPct != null ? `${d.eficienciaPct}%` : '—'}
              </span>
              <span className="historico-pecas">{d.pecas} pç</span>
              <span className="historico-valor">R$ {d.valor.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
