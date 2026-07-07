import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

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
  const porPilotista = {};
  for (const r of rows) {
    const nome = r.pilotista_nome || 'Sem pilotista';
    porPilotista[nome] = (porPilotista[nome] || 0) + (r.valor || 0);
  }

  return (
    <div>
      <h1>Painel</h1>
      <p className="subtitle">{mes}</p>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-label">Total do mês</span>
          <span className="stat-value">R$ {total.toFixed(2)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peças lançadas</span>
          <span className="stat-value">{rows.length}</span>
        </div>
      </div>

      <h2>Total por Pilotista</h2>
      <ul className="totals">
        {Object.entries(porPilotista).map(([nome, valor]) => (
          <li key={nome}>
            <span>{nome}</span>
            <strong>R$ {valor.toFixed(2)}</strong>
          </li>
        ))}
        {rows.length === 0 && <li>Nenhum lançamento este mês ainda.</li>}
      </ul>
    </div>
  );
}
