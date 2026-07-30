import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Icon from '@/app/icons';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function DashboardPage() {
  const session = getSession();
  if (session.role !== 'admin') redirect('/lancar');

  const mes = currentMonth();
  const rows = db
    .prepare(
      `SELECT l.*, p.nome AS pilotista_nome
       FROM lancamentos l
       LEFT JOIN pilotistas p ON p.id = l.pilotista_id
       WHERE l.mes_ano = ?`
    )
    .all(mes);

  const total = rows.reduce((s, r) => s + (r.valor || 0), 0);
  const pendentes = rows.filter((r) => r.aprovacao === 'Pendente').length;

  const porPilotista = {};
  for (const r of rows) {
    const nome = r.pilotista_nome || 'Sem pilotista';
    porPilotista[nome] = (porPilotista[nome] || 0) + (r.valor || 0);
  }
  const ranking = Object.entries(porPilotista).sort((a, b) => b[1] - a[1]);
  const maiorValor = ranking.length > 0 ? ranking[0][1] : 0;

  return (
    <div>
      <h1>
        <span className="card-icon">
          <Icon name="home" />
        </span>
        Painel
      </h1>
      <p className="subtitle">Visão geral de {mes}</p>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Icon name="dollar" />
          </div>
          <span className="stat-label">Total do mês</span>
          <span className="stat-value">R$ {total.toFixed(2)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Icon name="list" />
          </div>
          <span className="stat-label">Peças lançadas</span>
          <span className="stat-value">{rows.length}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Icon name="clock" />
          </div>
          <span className="stat-label">Aguardando aprovação</span>
          <span className="stat-value">{pendentes}</span>
        </div>
      </div>

      <h2>Total por Pilotista</h2>
      {ranking.length === 0 && <p className="subtitle">Nenhum lançamento este mês ainda.</p>}
      {ranking.length > 0 && (
        <ul className="ranking">
          {ranking.map(([nome, valor]) => (
            <li key={nome}>
              <div className="ranking-row">
                <span className="ranking-name">{nome}</span>
                <span className="ranking-value">R$ {valor.toFixed(2)}</span>
              </div>
              <div className="ranking-bar-track">
                <div
                  className="ranking-bar-fill"
                  style={{ width: `${maiorValor ? (valor / maiorValor) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
