import Link from 'next/link';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import AprovacaoBadge from '@/app/AprovacaoBadge';
import Icon from '@/app/icons';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function LancamentosPage() {
  const session = getSession();
  const mes = currentMonth();
  const isAdmin = session.role === 'admin';

  const rows = db
    .prepare(
      `SELECT l.*, t.nome AS tipo_nome, p.nome AS pilotista_nome
       FROM lancamentos l
       LEFT JOIN tipos_peca t ON t.id = l.tipo_peca_id
       LEFT JOIN pilotistas p ON p.id = l.pilotista_id
       WHERE l.mes_ano = ?
       ORDER BY l.data DESC, l.id DESC`
    )
    .all(mes);

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="list" />
        </span>
        Lançamentos do Mês
      </h1>
      <p className="subtitle">{mes}</p>
      {rows.length === 0 && <p>Nenhuma peça lançada este mês ainda.</p>}
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
                {isAdmin && <th>Valor</th>}
                <th></th>
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
                  <td>{r.nome_modelista}</td>
                  <td>{r.pilotista_nome}</td>
                  <td>
                    <AprovacaoBadge status={r.aprovacao} />
                  </td>
                  {isAdmin && <td>{r.valor != null ? `R$ ${r.valor.toFixed(2)}` : '-'}</td>}
                  <td>
                    <Link href={`/lancamentos/${r.id}`}>Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
