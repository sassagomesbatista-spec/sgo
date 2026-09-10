// Consultas de status "ao vivo" da pilotagem, compartilhadas entre as
// páginas (primeira renderização no servidor) e as rotas /api/*/status
// (usadas pelo polling do lado do cliente) — pra nunca divergir a lógica
// entre a primeira tela que aparece e as atualizações seguintes.
import db from './db';

const NIVEL_TEMPO_COL = {
  Simples: 'tempo_padrao_simples',
  Médio: 'tempo_padrao_medio',
  Difícil: 'tempo_padrao_dificil',
};

function tempoPadraoMinutos(tipoPecaId, nivel) {
  const col = NIVEL_TEMPO_COL[nivel];
  if (!tipoPecaId || !col) return null;
  const tipo = db.prepare(`SELECT ${col} AS tempo FROM tipos_peca WHERE id = ?`).get(tipoPecaId);
  return tipo?.tempo ?? null;
}

// Eficiência do dia (método SAM, padrão da indústria de confecção):
// % = (soma do tempo padrão das peças feitas hoje) / carga horária diária x 100
// Null quando nenhuma peça feita hoje tem tempo padrão cadastrado — sem
// isso, "nenhum dado ainda" e "0% de eficiência" ficavam indistinguíveis.
function eficienciaHoje(pilotistaId, cargaHorariaDiariaMin) {
  const hoje = new Date().toISOString().slice(0, 10);
  const linha = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(tempo_padrao_min), 0) AS min
       FROM lancamentos WHERE pilotista_id = ? AND data = ? AND tempo_padrao_min IS NOT NULL`
    )
    .get(pilotistaId, hoje);
  if (!cargaHorariaDiariaMin || linha.n === 0) return null;
  return Math.round((linha.min / cargaHorariaDiariaMin) * 1000) / 10;
}

export function pilotistaStatus(pilotistaId) {
  const pilotista = db.prepare('SELECT * FROM pilotistas WHERE id = ?').get(pilotistaId);

  const exec = db
    .prepare(
      `SELECT e.*, o.tipo_peca_id, o.referencia, o.cliente, o.tamanho, o.nivel, t.nome AS tipo_nome
       FROM execucoes e
       JOIN ordens_producao o ON o.id = e.ordem_id
       LEFT JOIN tipos_peca t ON t.id = o.tipo_peca_id
       WHERE e.pilotista_id = ? AND e.status = 'em_andamento'`
    )
    .get(pilotistaId);

  let execucaoAtual = null;
  if (exec) {
    const pausaAberta = db
      .prepare('SELECT * FROM pausas WHERE execucao_id = ? AND retomada_em IS NULL')
      .get(exec.id);
    execucaoAtual = {
      id: exec.id,
      tipo_nome: exec.tipo_nome,
      referencia: exec.referencia,
      cliente: exec.cliente,
      tamanho: exec.tamanho,
      nivel: exec.nivel,
      iniciado_em: exec.iniciado_em,
      segundos_pausados: exec.segundos_pausados,
      pausada: !!pausaAberta,
      pausa_iniciada_em: pausaAberta?.iniciada_em || null,
      pausa_motivo: pausaAberta?.motivo || null,
      tempo_padrao_min: tempoPadraoMinutos(exec.tipo_peca_id, exec.nivel),
    };
  }

  const proxima = db
    .prepare(
      `SELECT o.*, t.nome AS tipo_nome
       FROM ordens_producao o
       LEFT JOIN tipos_peca t ON t.id = o.tipo_peca_id
       WHERE o.pilotista_id = ? AND o.status IN ('pendente','em_andamento') AND o.quantidade_feita < o.quantidade
       ORDER BY o.ordem_fila ASC LIMIT 1`
    )
    .get(pilotistaId);

  const filaRestante = db
    .prepare(
      `SELECT COUNT(*) AS n FROM ordens_producao
       WHERE pilotista_id = ? AND status IN ('pendente','em_andamento') AND quantidade_feita < quantidade`
    )
    .get(pilotistaId).n;

  const hoje = new Date().toISOString().slice(0, 10);
  const resumoHoje = db
    .prepare(
      `SELECT COUNT(*) AS pecas, COALESCE(SUM(valor), 0) AS valor
       FROM lancamentos WHERE pilotista_id = ? AND data = ?`
    )
    .get(pilotistaId, hoje);

  return {
    execucaoAtual,
    proximaOrdem: proxima
      ? {
          id: proxima.id,
          tipo_nome: proxima.tipo_nome,
          referencia: proxima.referencia,
          cliente: proxima.cliente,
          tamanho: proxima.tamanho,
          nivel: proxima.nivel,
          quantidade: proxima.quantidade,
          quantidade_feita: proxima.quantidade_feita,
          tempo_padrao_min: tempoPadraoMinutos(proxima.tipo_peca_id, proxima.nivel),
        }
      : null,
    filaRestante,
    hoje: {
      pecas: resumoHoje.pecas,
      valor: resumoHoje.valor,
      eficienciaPct: eficienciaHoje(pilotistaId, pilotista?.carga_horaria_diaria_min),
    },
    cargaHorariaDiariaMin: pilotista?.carga_horaria_diaria_min ?? null,
    servidorEm: new Date().toISOString(),
  };
}

// Histórico dos últimos N dias (padrão 30) da pilotista: peças, valor e
// eficiência dia a dia — pra ela acompanhar a evolução, não só o dia de
// hoje. Mesma lógica de "sem dado ainda" vs "0%" da eficiência do dia.
export function historicoPilotista(pilotistaId, dias = 30) {
  const pilotista = db
    .prepare('SELECT carga_horaria_diaria_min FROM pilotistas WHERE id = ?')
    .get(pilotistaId);
  const carga = pilotista?.carga_horaria_diaria_min;

  const desde = new Date();
  desde.setUTCDate(desde.getUTCDate() - (dias - 1));
  const desdeStr = desde.toISOString().slice(0, 10);

  const linhas = db
    .prepare(
      `SELECT data,
              COUNT(*) AS pecas,
              COALESCE(SUM(valor), 0) AS valor,
              COUNT(CASE WHEN tempo_padrao_min IS NOT NULL THEN 1 END) AS nComTempo,
              COALESCE(SUM(tempo_padrao_min), 0) AS minPadrao
       FROM lancamentos
       WHERE pilotista_id = ? AND data >= ?
       GROUP BY data`
    )
    .all(pilotistaId, desdeStr);
  const porData = new Map(linhas.map((l) => [l.data, l]));

  const lista = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const data = d.toISOString().slice(0, 10);
    const l = porData.get(data);
    const eficienciaPct =
      l && carga && l.nComTempo > 0 ? Math.round((l.minPadrao / carga) * 1000) / 10 : null;
    lista.push({ data, pecas: l?.pecas ?? 0, valor: l?.valor ?? 0, eficienciaPct });
  }

  const ultimos7 = lista.slice(0, 7);
  const com7 = ultimos7.filter((d) => d.eficienciaPct != null);
  const mediaEficiencia7 =
    com7.length > 0
      ? Math.round((com7.reduce((s, d) => s + d.eficienciaPct, 0) / com7.length) * 10) / 10
      : null;

  return {
    dias: lista,
    ultimos7dias: {
      mediaEficienciaPct: mediaEficiencia7,
      pecas: ultimos7.reduce((s, d) => s + d.pecas, 0),
      valor: ultimos7.reduce((s, d) => s + d.valor, 0),
    },
  };
}

export function dashboardStatus() {
  const hoje = new Date().toISOString().slice(0, 10);
  const pilotistas = db.prepare('SELECT * FROM pilotistas WHERE ativo = 1 ORDER BY nome').all();

  const linhas = pilotistas.map((p) => {
    const exec = db
      .prepare(
        `SELECT e.*, o.referencia, o.cliente, t.nome AS tipo_nome
         FROM execucoes e
         JOIN ordens_producao o ON o.id = e.ordem_id
         LEFT JOIN tipos_peca t ON t.id = o.tipo_peca_id
         WHERE e.pilotista_id = ? AND e.status = 'em_andamento'`
      )
      .get(p.id);

    let atual = null;
    if (exec) {
      const pausaAberta = db
        .prepare('SELECT * FROM pausas WHERE execucao_id = ? AND retomada_em IS NULL')
        .get(exec.id);
      atual = {
        tipo_nome: exec.tipo_nome,
        referencia: exec.referencia,
        cliente: exec.cliente,
        iniciado_em: exec.iniciado_em,
        segundos_pausados: exec.segundos_pausados,
        pausada: !!pausaAberta,
        pausa_motivo: pausaAberta?.motivo || null,
      };
    }

    const resumoHoje = db
      .prepare(
        `SELECT COUNT(*) AS pecas, COALESCE(SUM(valor), 0) AS valor
         FROM lancamentos WHERE pilotista_id = ? AND data = ?`
      )
      .get(p.id, hoje);

    const filaRestante = db
      .prepare(
        `SELECT COUNT(*) AS n FROM ordens_producao
         WHERE pilotista_id = ? AND status IN ('pendente','em_andamento') AND quantidade_feita < quantidade`
      )
      .get(p.id).n;

    return {
      pilotista_id: p.id,
      nome: p.nome,
      atual,
      filaRestante,
      hoje: {
        pecas: resumoHoje.pecas,
        valor: resumoHoje.valor,
        eficienciaPct: eficienciaHoje(p.id, p.carga_horaria_diaria_min),
      },
    };
  });

  return { linhas, servidorEm: new Date().toISOString() };
}
