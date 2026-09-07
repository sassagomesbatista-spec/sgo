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

      {/* Grid em vez de <table>: cada linha é um <form> de verdade envolvendo
          seus campos (display:contents tira ele do layout, os campos caem
          direto nas colunas do grid) — mais confiável que associar input a
          formulário só por id. */}
      <div className="table-wrap">
        <div className="grid-table" style={{ gridTemplateColumns: '1.3fr 1.3fr 1fr 1fr 1fr 1fr auto auto' }}>
          <div className="grid-row grid-header">
            <div>Nome</div>
            <div>Contato</div>
            <div>Tabela de Preço</div>
            <div>Carga horária/dia (min)</div>
            <div>Usuário</div>
            <div>Senha</div>
            <div>Ativo</div>
            <div></div>
          </div>
          {pilotistas.map((p) => (
            <form key={p.id} action={salvarPilotistaAction} className="grid-row">
              <input type="hidden" name="id" value={p.id} />
              <div>
                <input name="nome" defaultValue={p.nome} required />
              </div>
              <div>
                <input name="contato" defaultValue={p.contato || ''} placeholder="Whatsapp/telefone" />
              </div>
              <div>
                <select name="tabela_preco_id" defaultValue={p.tabela_preco_id || ''}>
                  <option value="">Regra padrão</option>
                  {tabelas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  name="carga_horaria_diaria_min"
                  defaultValue={p.carga_horaria_diaria_min ?? 480}
                  title="Carga horária diária (minutos) — usada pra calcular a eficiência do dia"
                />
              </div>
              <div>
                <input name="login_usuario" defaultValue={p.login_usuario || ''} placeholder="usuário de acesso" />
              </div>
              <div>
                <input
                  type="password"
                  name="login_senha"
                  placeholder={p.login_usuario ? 'nova senha (deixar em branco mantém)' : 'senha inicial'}
                />
              </div>
              <div>
                <label className="checkbox">
                  <input type="checkbox" name="ativo" defaultChecked={!!p.ativo} />
                </label>
              </div>
              <div>
                <button className="btn-sm" type="submit">
                  Salvar
                </button>
              </div>
            </form>
          ))}
        </div>
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
