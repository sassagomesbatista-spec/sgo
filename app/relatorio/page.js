import db from '@/lib/db';
import { getSession, homeFor } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PrintButton from './PrintButton';
import AprovacaoBadge from '@/app/AprovacaoBadge';
import Icon from '@/app/icons';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function RelatorioPage({ searchParams }) {
  const session = getSession();
  if (session.role !== 'admin') redirect(homeFor(session.role));

  const mes = searchParams?.mes || currentMonth();
  const pilotistaId = searchParams?.pilotista || '';

  const pilotistas = db.prepare('SELECT * FROM pilotistas ORDER BY nome').all();

  let query = `
    SELECT l.*, t.nome AS tipo_nome, p.nome AS pilotista_nome, m.nome AS modelista_nome
    FROM lancamentos l
    LEFT JOIN tipos_peca t ON t.id = l.tipo_peca_id
    LEFT JOIN pilotistas p ON p.id = l.pilotista_id
    LEFT JOIN modelistas m ON m.id = l.modelista_id
    WHERE l.mes_ano = ?
  `;
  const args = [mes];
  if (pilotistaId) {
    query += ' AND l.pilotista_id = ?';
    args.push(pilotistaId);
  }
  query += ' ORDER BY p.nome, l.data';

  const rows = db.prepare(query).all(...args);

  const totalGeral = rows.reduce((s, r) => s + (r.valor || 0), 0);
  const porPilotista = {};
  for (const r of rows) {
    const nome = r.pilotista_nome || 'Sem pilotista';
    porPilotista[nome] = (porPilotista[nome] || 0) + (r.valor || 0);
  }
  const totalModelistaGeral = rows.reduce((s, r) => s + (r.valor_modelista || 0), 0);
  const porModelista = {};
  for (const r of rows) {
    if (r.valor_modelista == null) continue;
    const nome = r.modelista_nome || r.nome_modelista || 'Sem modelista';
    porModelista[nome] = (porModelista[nome] || 0) + (r.valor_modelista || 0);
  }
  const pilotistaSelecionada = pilotistas.find((p) => String(p.id) === String(pilotistaId));

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="file" />
        </span>
        Relatório Mensal
      </h1>

      <form method="get" className="filters no-print">
        <label>
          Mês
          <input type="month" name="mes" defaultValue={mes} />
        </label>
        <label>
          Pilotista
          <select name="pilotista" defaultValue={pilotistaId}>
            <option value="">Todas</option>
            {pilotistas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" type="submit">
          Filtrar
        </button>
      </form>

      <PrintButton />

      <p className="subtitle">
        {mes}
        {pilotistaSelecionada ? ` — ${pilotistaSelecionada.nome}` : ''}
      </p>

      {rows.length === 0 && <p>Nenhum lançamento encontrado para este período.</p>}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Ref.</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Tam.</th>
                <th>Nível</th>
                <th>Modelista</th>
                <th>Pilotista</th>
                <th>Aprovação</th>
                <th>Valor Pilotista</th>
                <th>Valor Modelista</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.data}</td>
                  <td>{r.referencia}</td>
                  <td>{r.cliente}</td>
                  <td>{r.descricao_produto}</td>
                  <td>{r.tipo_nome}</td>
                  <td>{r.tamanho}</td>
                  <td>{r.nivel}</td>
                  <td>{r.modelista_nome || r.nome_modelista}</td>
                  <td>{r.pilotista_nome}</td>
                  <td>
                    <AprovacaoBadge status={r.aprovacao} />
                  </td>
                  <td>R$ {(r.valor || 0).toFixed(2)}</td>
                  <td>{r.valor_modelista != null ? `R$ ${r.valor_modelista.toFixed(2)}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Total por Pilotista</h2>
      <ul className="totals">
        {Object.entries(porPilotista).map(([nome, total]) => (
          <li key={nome}>
            <span>{nome}</span>
            <strong>R$ {total.toFixed(2)}</strong>
          </li>
        ))}
        {rows.length === 0 && <li>-</li>}
      </ul>
      <p className="total-geral">
        Total Geral Pilotistas: <strong>R$ {totalGeral.toFixed(2)}</strong>
      </p>

      {Object.keys(porModelista).length > 0 && (
        <>
          <h2>Total por Modelista</h2>
          <p className="subtitle">Só aparece aqui quem tem uma tabela de preço vinculada.</p>
          <ul className="totals">
            {Object.entries(porModelista).map(([nome, total]) => (
              <li key={nome}>
                <span>{nome}</span>
                <strong>R$ {total.toFixed(2)}</strong>
              </li>
            ))}
          </ul>
          <p className="total-geral">
            Total Geral Modelistas: <strong>R$ {totalModelistaGeral.toFixed(2)}</strong>
          </p>
        </>
      )}
    </div>
  );
}
