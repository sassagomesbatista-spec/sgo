import Link from 'next/link';
import db from '@/lib/db';
import { getSession, homeFor } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { salvarTipoPecaAction, criarTabelaPrecoAction } from '@/app/actions';
import Icon from '@/app/icons';
import ImportarPrecosExcel from './ImportarPrecosExcel';

export default function PrecosPage() {
  const session = getSession();
  if (session.role !== 'admin') redirect(homeFor(session.role));

  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();
  const tabelas = db
    .prepare(
      `SELECT tp.*,
        (SELECT COUNT(*) FROM pilotistas WHERE tabela_preco_id = tp.id) AS n_pilotistas,
        (SELECT COUNT(*) FROM modelistas WHERE tabela_preco_id = tp.id) AS n_modelistas
       FROM tabelas_preco tp ORDER BY tp.nome`
    )
    .all();

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="dollar" />
        </span>
        Regra de Preços
      </h1>
      <p className="subtitle">Valores usados para calcular automaticamente cada lançamento</p>

      {/* Grid em vez de <table>: cada linha é um <form> de verdade (envolvendo
          seus próprios campos, do jeito mais simples e confiável de submeter),
          com display:contents pra ele "desaparecer" do layout e os campos
          caírem direto nas colunas do grid — sem precisar do truque de
          associar input a formulário por id, que não é tão confiável. */}
      <div className="table-wrap">
        <div className="grid-table" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr 1fr 1fr auto' }}>
          <div className="grid-row grid-header">
            <div>Tipo de Peça</div>
            <div>Simples (R$)</div>
            <div>Médio (R$)</div>
            <div>Difícil (R$)</div>
            <div>Tempo Simples (min)</div>
            <div>Tempo Médio (min)</div>
            <div>Tempo Difícil (min)</div>
            <div></div>
          </div>
          {tipos.map((t) => (
            <form key={t.id} action={salvarTipoPecaAction} className="grid-row">
              <input type="hidden" name="id" value={t.id} />
              <div>
                <input name="nome" defaultValue={t.nome} required />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  name="preco_simples"
                  defaultValue={t.preco_simples ?? ''}
                  placeholder="R$"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  name="preco_medio"
                  defaultValue={t.preco_medio ?? ''}
                  placeholder="R$"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  name="preco_dificil"
                  defaultValue={t.preco_dificil ?? ''}
                  placeholder="R$"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  name="tempo_padrao_simples"
                  defaultValue={t.tempo_padrao_simples ?? ''}
                  placeholder="min"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  name="tempo_padrao_medio"
                  defaultValue={t.tempo_padrao_medio ?? ''}
                  placeholder="min"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  name="tempo_padrao_dificil"
                  defaultValue={t.tempo_padrao_dificil ?? ''}
                  placeholder="min"
                />
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

      <h2>Importar Tabela de Preços (Excel)</h2>
      <p className="subtitle">
        Colunas: <strong>Tipo de Peça</strong>, <strong>Preço Simples</strong>,{' '}
        <strong>Preço Médio</strong>, <strong>Preço Difícil</strong> e, opcionalmente,{' '}
        <strong>Tempo Padrão Simples/Médio/Difícil</strong> (em minutos — usado pra calcular a
        eficiência da pilotista). Tipo já cadastrado tem os valores atualizados; tipo novo é
        criado.
      </p>
      <ImportarPrecosExcel />

      <h2>Novo Tipo de Peça</h2>
      <form action={salvarTipoPecaAction} className="form">
        <label>
          Nome
          <input name="nome" required />
        </label>
        <label>
          Preço Simples (R$)
          <input type="number" step="0.01" name="preco_simples" />
        </label>
        <label>
          Preço Médio (R$)
          <input type="number" step="0.01" name="preco_medio" />
        </label>
        <label>
          Preço Difícil (R$)
          <input type="number" step="0.01" name="preco_dificil" />
        </label>
        <div className="form-section-label">Tempo padrão (SAM) — em minutos</div>
        <label>
          Tempo Simples (min)
          <input type="number" step="0.01" name="tempo_padrao_simples" placeholder="ex: 50" />
        </label>
        <label>
          Tempo Médio (min)
          <input type="number" step="0.01" name="tempo_padrao_medio" placeholder="auto: +20%" />
        </label>
        <label>
          Tempo Difícil (min)
          <input type="number" step="0.01" name="tempo_padrao_dificil" placeholder="auto: +20%" />
        </label>
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>

      <h2>Tabelas de Preço por Modelista/Pilotista</h2>
      <p className="subtitle">
        Além da regra padrão acima, dá pra criar uma tabela distinta pra uma modelista ou
        pilotista específica — depois é só vincular ela em Modelistas/Pilotistas. Quem não
        tiver tabela vinculada continua usando a Regra de Preços padrão normalmente.
      </p>

      {tabelas.length > 0 && (
        <ul className="ranking" style={{ marginBottom: 20 }}>
          {tabelas.map((t) => (
            <li key={t.id}>
              <div className="ranking-row">
                <Link href={`/precos/tabela/${t.id}`}>{t.nome}</Link>
                <span style={{ color: 'var(--text-light)', fontSize: 13 }}>
                  {t.n_pilotistas > 0 && `${t.n_pilotistas} pilotista(s)`}
                  {t.n_pilotistas > 0 && t.n_modelistas > 0 && ' · '}
                  {t.n_modelistas > 0 && `${t.n_modelistas} modelista(s)`}
                  {t.n_pilotistas === 0 && t.n_modelistas === 0 && 'sem ninguém vinculada ainda'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {tabelas.length === 0 && <p>Nenhuma tabela própria criada ainda.</p>}

      <form action={criarTabelaPrecoAction} className="form">
        <label>
          Nome da tabela (ex: nome da modelista/pilotista)
          <input name="nome" required placeholder="ex: Fulana" />
        </label>
        <button className="btn" type="submit">
          + Nova Tabela
        </button>
      </form>
    </div>
  );
}
