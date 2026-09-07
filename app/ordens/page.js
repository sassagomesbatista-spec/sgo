import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { cancelarOrdemAction, reatribuirOrdemAction } from '@/app/actions';
import ConfirmForm from '@/app/ConfirmForm';
import Icon from '@/app/icons';
import OrdemForm from './OrdemForm';

export default function OrdensPage() {
  const session = getSession();
  if (session.role === 'pilotista') redirect('/pilotagem');

  const isAdmin = session.role === 'admin';
  const pilotistas = db.prepare('SELECT * FROM pilotistas WHERE ativo = 1 ORDER BY nome').all();
  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();
  const clientes = db.prepare('SELECT nome FROM clientes ORDER BY nome').all().map((c) => c.nome);
  const tamanhos = db.prepare('SELECT nome FROM tamanhos ORDER BY nome').all().map((t) => t.nome);

  const abertas = db
    .prepare(
      `SELECT o.*, t.nome AS tipo_nome, p.nome AS pilotista_nome,
        (SELECT COUNT(*) FROM execucoes e WHERE e.ordem_id = o.id AND e.status = 'em_andamento') AS em_execucao
       FROM ordens_producao o
       LEFT JOIN tipos_peca t ON t.id = o.tipo_peca_id
       LEFT JOIN pilotistas p ON p.id = o.pilotista_id
       WHERE o.status IN ('pendente','em_andamento')
       ORDER BY p.nome, o.ordem_fila ASC`
    )
    .all();

  const concluidasRecentes = db
    .prepare(
      `SELECT o.*, t.nome AS tipo_nome, p.nome AS pilotista_nome
       FROM ordens_producao o
       LEFT JOIN tipos_peca t ON t.id = o.tipo_peca_id
       LEFT JOIN pilotistas p ON p.id = o.pilotista_id
       WHERE o.status IN ('concluido','cancelado')
       ORDER BY o.id DESC LIMIT 20`
    )
    .all();

  return (
    <div>
      <div className="card">
        <h1>
          <span className="card-icon">
            <Icon name="boxes" />
          </span>
          Ordens de Produção
        </h1>
        <p className="subtitle">
          Monta o lote de uma pilotista antes dela começar. Ela costura na ordem em que os
          itens forem criados aqui — não escolhe pular pra frente.
        </p>
        <OrdemForm pilotistas={pilotistas} tipos={tipos} clientes={clientes} tamanhos={tamanhos} />
      </div>

      <h2>Fila em aberto</h2>
      {abertas.length === 0 && <p className="subtitle">Nenhuma ordem pendente no momento.</p>}
      {abertas.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pilotista</th>
                <th>Tipo</th>
                <th>Ref.</th>
                <th>Cliente</th>
                <th>Tam.</th>
                <th>Nível</th>
                <th>Progresso</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {abertas.map((o) => (
                <tr key={o.id}>
                  <td>{o.pilotista_nome}</td>
                  <td>{o.tipo_nome}</td>
                  <td>{o.referencia}</td>
                  <td>{o.cliente}</td>
                  <td>{o.tamanho}</td>
                  <td>{o.nivel}</td>
                  <td>
                    {o.quantidade_feita} / {o.quantidade}
                  </td>
                  <td>{o.status === 'em_andamento' ? 'Em produção' : 'Aguardando'}</td>
                  {isAdmin && (
                    <td>
                      {o.em_execucao > 0 ? (
                        <span className="subtitle" style={{ margin: 0 }}>
                          sendo costurada agora
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <form action={reatribuirOrdemAction} className="inline-form">
                            <input type="hidden" name="id" value={o.id} />
                            <select name="novo_pilotista_id" defaultValue="">
                              <option value="" disabled>
                                Redirecionar p/...
                              </option>
                              {pilotistas
                                .filter((p) => p.id !== o.pilotista_id)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome}
                                  </option>
                                ))}
                            </select>
                            <button className="btn-sm" type="submit">
                              <Icon name="swap" />
                            </button>
                          </form>
                          <ConfirmForm action={cancelarOrdemAction} confirmMessage="Cancelar essa ordem?">
                            <input type="hidden" name="id" value={o.id} />
                            <button className="btn-sm btn-danger" type="submit">
                              Cancelar
                            </button>
                          </ConfirmForm>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {concluidasRecentes.length > 0 && (
        <>
          <h2>Concluídas/canceladas recentemente</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pilotista</th>
                  <th>Tipo</th>
                  <th>Ref.</th>
                  <th>Cliente</th>
                  <th>Qtd.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {concluidasRecentes.map((o) => (
                  <tr key={o.id}>
                    <td>{o.pilotista_nome}</td>
                    <td>{o.tipo_nome}</td>
                    <td>{o.referencia}</td>
                    <td>{o.cliente}</td>
                    <td>
                      {o.quantidade_feita} / {o.quantidade}
                    </td>
                    <td>{o.status === 'concluido' ? 'Concluído' : 'Cancelado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
