// Consultas de status "ao vivo" da pilotagem, compartilhadas entre as
// páginas (primeira renderização no servidor) e as rotas /api/*/status
// (usadas pelo polling do lado do cliente) — pra nunca divergir a lógica
// entre a primeira tela que aparece e as atualizações seguintes.
import db from './db';

export function pilotistaStatus(pilotistaId) {
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
        }
      : null,
    filaRestante,
    hoje: { pecas: resumoHoje.pecas, valor: resumoHoje.valor },
    servidorEm: new Date().toISOString(),
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
      hoje: { pecas: resumoHoje.pecas, valor: resumoHoje.valor },
    };
  });

  return { linhas, servidorEm: new Date().toISOString() };
}
