import db from '@/lib/db';
import { getSession, homeFor } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { salvarPilotistaAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function PilotistasPage({ searchParams }) {
  const session = getSession();
  if (session.role !== 'admin') redirect(homeFor(session.role));

  const pilotistas = db
    .prepare(
      `SELECT p.*, u.usuario AS login_usuario
       FROM pilotistas p
       LEFT JOIN usuarios u ON u.pilotista_id = p.id
       ORDER BY p.ativo DESC, p.nome`
    )
    .all();
  const tabelas = db.prepare('SELECT * FROM tabelas_preco ORDER BY nome').all();

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="scissors" />
        </span>
        Pilotistas
      </h1>
      <p className="subtitle">
        O usuário/senha aqui é o login que ela usa no celular dela pra ver a produção em tempo
        real. É a equipe do escritório que define — não a pilotista.
      </p>
      {searchParams?.erro === 'usuario_em_uso' && (
        <p className="error">Esse nome de usuário já está em uso por outra pessoa. Escolha outro.</p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Tabela de Preço</th>
              <th>Carga horária/dia (min)</th>
              <th>Usuário</th>
              <th>Senha</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pilotistas.map((p) => {
              const formId = `pilotista-${p.id}`;
              return (
                <tr key={p.id}>
                  <td>
                    <input form={formId} name="nome" defaultValue={p.nome} required />
                  </td>
                  <td>
                    <input
                      form={formId}
                      name="contato"
                      defaultValue={p.contato || ''}
                      placeholder="Whatsapp/telefone"
                    />
                  </td>
                  <td>
                    <select form={formId} name="tabela_preco_id" defaultValue={p.tabela_preco_id || ''}>
                      <option value="">Regra padrão</option>
                      {tabelas.map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      form={formId}
                      type="number"
                      name="carga_horaria_diaria_min"
                      defaultValue={p.carga_horaria_diaria_min ?? 480}
                      title="Carga horária diária (minutos) — usada pra calcular a eficiência do dia"
                    />
                  </td>
                  <td>
                    <input
                      form={formId}
                      name="login_usuario"
                      defaultValue={p.login_usuario || ''}
                      placeholder="usuário de acesso"
                    />
                  </td>
                  <td>
                    <input
                      form={formId}
                      type="password"
                      name="login_senha"
                      placeholder={p.login_usuario ? 'nova senha (deixar em branco mantém)' : 'senha inicial'}
                    />
                  </td>
                  <td>
                    <label className="checkbox">
                      <input form={formId} type="checkbox" name="ativo" defaultChecked={!!p.ativo} />
                    </label>
                  </td>
                  <td>
                    <form id={formId} action={salvarPilotistaAction}>
                      <input type="hidden" name="id" value={p.id} />
                    </form>
                    <button form={formId} className="btn-sm" type="submit">
                      Salvar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Nova Pilotista</h2>
      <form action={salvarPilotistaAction} className="form">
        <label>
          Nome
          <input name="nome" required />
        </label>
        <label>
          Contato
          <input name="contato" placeholder="Whatsapp/telefone" />
        </label>
        <label>
          Tabela de Preço
          <select name="tabela_preco_id" defaultValue="">
            <option value="">Regra padrão</option>
            {tabelas.map((t) => (
              <option key={t.id} value={t.id}>{t.nome}</option>
            ))}
          </select>
        </label>
        <label>
          Carga horária diária (min)
          <input type="number" name="carga_horaria_diaria_min" defaultValue={480} />
        </label>
        <label>
          Usuário de acesso (celular)
          <input name="login_usuario" placeholder="ex: maria" />
        </label>
        <label>
          Senha inicial
          <input type="password" name="login_senha" placeholder="ex: 1234" />
        </label>
        <label className="checkbox">
          <input type="checkbox" name="ativo" defaultChecked /> Ativo
        </label>
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>
    </div>
  );
}
