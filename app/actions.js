'use server';

import db from '@/lib/db';
import {
  getSession,
  createSessionToken,
  SESSION_COOKIE,
  hashPassword,
  checkPassword,
} from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Acesso restrito à administradora.');
  }
  return session;
}

function requireLogin() {
  const session = getSession();
  if (!session) throw new Error('Não autenticado.');
  return session;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

// ---------- AUTENTICAÇÃO ----------

export async function loginAction(formData) {
  const usuario = formData.get('usuario')?.toString().trim();
  const senha = formData.get('senha')?.toString() || '';

  const user = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
  if (!user || !checkPassword(senha, user.senha_hash)) {
    redirect('/login?erro=1');
  }

  const token = createSessionToken({
    id: user.id,
    usuario: user.usuario,
    role: user.role,
    nome: user.nome,
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(user.role === 'admin' ? '/dashboard' : '/lancar');
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect('/login');
}

export async function changePasswordAction(formData) {
  const session = requireLogin();
  const alvo = formData.get('usuario_alvo')?.toString() || session.usuario;
  if (alvo !== session.usuario && session.role !== 'admin') {
    throw new Error('Sem permissão.');
  }
  const novaSenha = formData.get('nova_senha')?.toString() || '';
  if (novaSenha.length < 4) return;

  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE usuario = ?').run(
    hashPassword(novaSenha),
    alvo
  );
  revalidatePath('/conta');
}

// ---------- PILOTISTAS ----------

export async function salvarPilotistaAction(formData) {
  requireAdmin();
  const id = formData.get('id');
  const nome = formData.get('nome')?.toString().trim();
  const contato = formData.get('contato')?.toString().trim() || '';
  const ativo = formData.get('ativo') ? 1 : 0;
  const tabelaPrecoId = Number(formData.get('tabela_preco_id')) || null;
  if (!nome) return;

  if (id) {
    db.prepare('UPDATE pilotistas SET nome=?, contato=?, ativo=?, tabela_preco_id=? WHERE id=?').run(
      nome,
      contato,
      ativo,
      tabelaPrecoId,
      id
    );
  } else {
    db.prepare('INSERT INTO pilotistas (nome, contato, ativo, tabela_preco_id) VALUES (?,?,?,?)').run(
      nome,
      contato,
      ativo,
      tabelaPrecoId
    );
  }
  revalidatePath('/pilotistas');
}

// ---------- TIPOS DE PEÇA ----------

export async function salvarTipoPecaAction(formData) {
  requireAdmin();
  const id = formData.get('id');
  const nome = formData.get('nome')?.toString().trim();
  const parse = (v) => (v === null || v === '' ? null : Number(v));
  let preco_simples = parse(formData.get('preco_simples'));
  const preco_medio = parse(formData.get('preco_medio'));
  let preco_dificil = parse(formData.get('preco_dificil'));
  if (!nome) return;

  // Se só o preço Médio for informado, calcula Simples (-5%) e Difícil
  // (+20%) automaticamente, seguindo o mesmo padrão dos demais tipos.
  if (preco_medio != null) {
    if (preco_simples == null) preco_simples = Math.round(preco_medio * 0.95);
    if (preco_dificil == null) preco_dificil = Math.round(preco_medio * 1.2);
  }

  if (id) {
    db.prepare(
      'UPDATE tipos_peca SET nome=?, preco_simples=?, preco_medio=?, preco_dificil=? WHERE id=?'
    ).run(nome, preco_simples, preco_medio, preco_dificil, id);
  } else {
    db.prepare(
      'INSERT INTO tipos_peca (nome, preco_simples, preco_medio, preco_dificil) VALUES (?,?,?,?)'
    ).run(nome, preco_simples, preco_medio, preco_dificil);
  }
  revalidatePath('/precos');
}

// ---------- CLIENTES / MODELISTAS / TAMANHOS ----------

function syncLookup(table, nome) {
  if (!nome) return;
  db.prepare(`INSERT OR IGNORE INTO ${table} (nome) VALUES (?)`).run(nome);
}

// ---------- Cálculo de valor (Regra de Preços padrão + tabelas por profissional) ----------

const NIVEL_COL = { Simples: 'preco_simples', Médio: 'preco_medio', Difícil: 'preco_dificil' };

function precoPadrao(tipoPecaId, nivel) {
  const col = NIVEL_COL[nivel];
  if (!tipoPecaId || !col) return null;
  const tipo = db.prepare(`SELECT ${col} AS preco FROM tipos_peca WHERE id = ?`).get(tipoPecaId);
  return tipo?.preco ?? null;
}

// Preço na tabela custom da modelista/pilotista, com fallback pra Regra de
// Preços padrão em qualquer campo que ela não tenha preenchido (tabela nasce
// como cópia da padrão, mas tipos de peça criados depois não entram sozinhos).
function precoComFallback(tabelaPrecoId, tipoPecaId, nivel) {
  const col = NIVEL_COL[nivel];
  if (!tabelaPrecoId || !tipoPecaId || !col) return precoPadrao(tipoPecaId, nivel);
  const item = db
    .prepare(`SELECT ${col} AS preco FROM tabela_preco_itens WHERE tabela_id = ? AND tipo_peca_id = ?`)
    .get(tabelaPrecoId, tipoPecaId);
  return item?.preco ?? precoPadrao(tipoPecaId, nivel);
}

// Pilotista sempre tem valor calculado (comportamento de sempre): usa a
// tabela dela se tiver uma vinculada, senão a Regra de Preços padrão.
function calcularValorPilotista(pilotistaId, tipoPecaId, nivel) {
  if (!pilotistaId) return null;
  const pilotista = db.prepare('SELECT tabela_preco_id FROM pilotistas WHERE id = ?').get(pilotistaId);
  return precoComFallback(pilotista?.tabela_preco_id, tipoPecaId, nivel);
}

// Modelista só tem valor calculado se a admin vinculou uma tabela de preço a
// ela — modelista nunca foi paga automaticamente por esse app antes, então
// sem tabela vinculada o campo continua null (não passa a cobrar sozinho).
function calcularValorModelista(modelistaId, tipoPecaId, nivel) {
  if (!modelistaId) return null;
  const modelista = db.prepare('SELECT tabela_preco_id FROM modelistas WHERE id = ?').get(modelistaId);
  if (!modelista?.tabela_preco_id) return null;
  return precoComFallback(modelista.tabela_preco_id, tipoPecaId, nivel);
}

function resolverModelistaId(nome) {
  if (!nome) return null;
  return db.prepare('SELECT id FROM modelistas WHERE nome = ?').get(nome)?.id ?? null;
}

export async function salvarClienteAction(formData) {
  requireLogin();
  const id = formData.get('id');
  const nome = formData.get('nome')?.toString().trim();
  if (!nome) return;
  if (id) {
    db.prepare('UPDATE clientes SET nome=? WHERE id=?').run(nome, id);
  } else {
    db.prepare('INSERT OR IGNORE INTO clientes (nome) VALUES (?)').run(nome);
  }
  revalidatePath('/clientes');
}

export async function salvarModelistaAction(formData) {
  const session = requireLogin();
  const id = formData.get('id');
  const nome = formData.get('nome')?.toString().trim();
  // Vincular tabela de preço mexe em valor calculado — só a admin decide isso,
  // mesmo que assistente também possa cadastrar/renomear modelista.
  const isAdmin = session.role === 'admin';
  if (!nome) return;
  if (id) {
    if (isAdmin) {
      const tabelaPrecoId = Number(formData.get('tabela_preco_id')) || null;
      db.prepare('UPDATE modelistas SET nome=?, tabela_preco_id=? WHERE id=?').run(nome, tabelaPrecoId, id);
    } else {
      db.prepare('UPDATE modelistas SET nome=? WHERE id=?').run(nome, id);
    }
  } else {
    const tabelaPrecoId = isAdmin ? Number(formData.get('tabela_preco_id')) || null : null;
    db.prepare('INSERT OR IGNORE INTO modelistas (nome, tabela_preco_id) VALUES (?,?)').run(nome, tabelaPrecoId);
  }
  revalidatePath('/modelistas');
}

// ---------- TABELAS DE PREÇO (por modelista/pilotista) ----------

export async function criarTabelaPrecoAction(formData) {
  requireAdmin();
  const nome = formData.get('nome')?.toString().trim();
  if (!nome) return;

  const info = db.prepare('INSERT INTO tabelas_preco (nome) VALUES (?)').run(nome);
  // Começa com os mesmos valores da Regra de Preços padrão, pra não nascer
  // zerada — a admin só ajusta o que for diferente pra essa modelista/pilotista.
  const tipos = db.prepare('SELECT * FROM tipos_peca').all();
  const insertItem = db.prepare(
    'INSERT INTO tabela_preco_itens (tabela_id, tipo_peca_id, preco_simples, preco_medio, preco_dificil) VALUES (?,?,?,?,?)'
  );
  for (const t of tipos) {
    insertItem.run(info.lastInsertRowid, t.id, t.preco_simples, t.preco_medio, t.preco_dificil);
  }
  // Também precisa revalidar Pilotistas/Modelistas — o seletor "Tabela de
  // Preço" deles lê a lista de tabelas_preco, e sem isso ficava mostrando a
  // versão antiga (sem essa tabela nova) até um refresh manual da página.
  revalidatePath('/precos');
  revalidatePath('/pilotistas');
  revalidatePath('/modelistas');
  redirect(`/precos/tabela/${info.lastInsertRowid}`);
}

export async function renomearTabelaPrecoAction(formData) {
  requireAdmin();
  const id = Number(formData.get('id'));
  const nome = formData.get('nome')?.toString().trim();
  if (!id || !nome) return;
  db.prepare('UPDATE tabelas_preco SET nome=? WHERE id=?').run(nome, id);
  revalidatePath('/precos');
  revalidatePath(`/precos/tabela/${id}`);
  revalidatePath('/pilotistas');
  revalidatePath('/modelistas');
}

export async function excluirTabelaPrecoAction(formData) {
  requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const emUso =
    db.prepare('SELECT COUNT(*) AS n FROM pilotistas WHERE tabela_preco_id = ?').get(id).n +
    db.prepare('SELECT COUNT(*) AS n FROM modelistas WHERE tabela_preco_id = ?').get(id).n;
  if (emUso > 0) {
    throw new Error('Essa tabela está em uso por uma modelista/pilotista. Troque a tabela dela antes de excluir.');
  }
  db.prepare('DELETE FROM tabela_preco_itens WHERE tabela_id = ?').run(id);
  db.prepare('DELETE FROM tabelas_preco WHERE id = ?').run(id);
  revalidatePath('/precos');
  revalidatePath('/pilotistas');
  revalidatePath('/modelistas');
}

// Vincula/desvincula pilotistas e modelistas a uma tabela, tudo de uma vez,
// direto na tela da própria tabela — antes só dava pra vincular indo em
// Pilotistas/Modelistas separadamente, o que fazia parecer que nada estava
// conectado com nada.
export async function vincularTabelaPrecoAction(formData) {
  requireAdmin();
  const tabelaId = Number(formData.get('tabela_id'));
  if (!tabelaId) return;

  const pilotistaIds = formData.getAll('pilotista_ids').map(Number);
  const modelistaIds = formData.getAll('modelista_ids').map(Number);

  const todosPilotistas = db.prepare('SELECT id, tabela_preco_id FROM pilotistas').all();
  for (const p of todosPilotistas) {
    const marcada = pilotistaIds.includes(p.id);
    if (marcada && p.tabela_preco_id !== tabelaId) {
      db.prepare('UPDATE pilotistas SET tabela_preco_id=? WHERE id=?').run(tabelaId, p.id);
    } else if (!marcada && p.tabela_preco_id === tabelaId) {
      db.prepare('UPDATE pilotistas SET tabela_preco_id=NULL WHERE id=?').run(p.id);
    }
  }

  const todosModelistas = db.prepare('SELECT id, tabela_preco_id FROM modelistas').all();
  for (const m of todosModelistas) {
    const marcada = modelistaIds.includes(m.id);
    if (marcada && m.tabela_preco_id !== tabelaId) {
      db.prepare('UPDATE modelistas SET tabela_preco_id=? WHERE id=?').run(tabelaId, m.id);
    } else if (!marcada && m.tabela_preco_id === tabelaId) {
      db.prepare('UPDATE modelistas SET tabela_preco_id=NULL WHERE id=?').run(m.id);
    }
  }

  revalidatePath(`/precos/tabela/${tabelaId}`);
  revalidatePath('/precos');
  revalidatePath('/pilotistas');
  revalidatePath('/modelistas');
}

export async function salvarTabelaPrecoItemAction(formData) {
  requireAdmin();
  const tabelaId = Number(formData.get('tabela_id'));
  const tipoPecaId = Number(formData.get('tipo_peca_id'));
  const parse = (v) => (v === null || v === '' ? null : Number(v));
  const preco_simples = parse(formData.get('preco_simples'));
  const preco_medio = parse(formData.get('preco_medio'));
  const preco_dificil = parse(formData.get('preco_dificil'));
  if (!tabelaId || !tipoPecaId) return;

  db.prepare(
    `INSERT INTO tabela_preco_itens (tabela_id, tipo_peca_id, preco_simples, preco_medio, preco_dificil)
     VALUES (?,?,?,?,?)
     ON CONFLICT(tabela_id, tipo_peca_id) DO UPDATE SET
       preco_simples=excluded.preco_simples, preco_medio=excluded.preco_medio, preco_dificil=excluded.preco_dificil`
  ).run(tabelaId, tipoPecaId, preco_simples, preco_medio, preco_dificil);
  revalidatePath(`/precos/tabela/${tabelaId}`);
}

export async function salvarTamanhoAction(formData) {
  requireLogin();
  const id = formData.get('id');
  const nome = formData.get('nome')?.toString().trim();
  if (!nome) return;
  if (id) {
    db.prepare('UPDATE tamanhos SET nome=? WHERE id=?').run(nome, id);
  } else {
    db.prepare('INSERT OR IGNORE INTO tamanhos (nome) VALUES (?)').run(nome);
  }
  revalidatePath('/tamanhos');
}

// ---------- LANÇAMENTOS ----------

export async function criarLancamentoAction(formData) {
  requireLogin();

  const data = formData.get('data')?.toString();
  const referencia = formData.get('referencia')?.toString() || '';
  const cliente = formData.get('cliente')?.toString() || '';
  const descricao_produto = formData.get('descricao_produto')?.toString() || '';
  const tipo_peca_id = Number(formData.get('tipo_peca_id')) || null;
  const tamanho = formData.get('tamanho')?.toString() || '';
  const nivel = formData.get('nivel')?.toString() || '';
  const nome_modelista = formData.get('nome_modelista')?.toString() || '';
  const pilotista_id = Number(formData.get('pilotista_id')) || null;
  const aprovacao = formData.get('aprovacao')?.toString() || 'Pendente';
  const observacoes = formData.get('observacoes')?.toString() || '';

  if (!data || !tipo_peca_id || !pilotista_id || !nivel) return;

  syncLookup('clientes', cliente);
  syncLookup('tamanhos', tamanho);
  syncLookup('modelistas', nome_modelista);
  const modelista_id = resolverModelistaId(nome_modelista);

  const valor = calcularValorPilotista(pilotista_id, tipo_peca_id, nivel);
  const valor_modelista = calcularValorModelista(modelista_id, tipo_peca_id, nivel);

  db.prepare(
    `INSERT INTO lancamentos
      (data, referencia, cliente, descricao_produto, tipo_peca_id, tamanho, nivel, nome_modelista, modelista_id, pilotista_id, aprovacao, observacoes, valor, valor_modelista, mes_ano)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    data,
    referencia,
    cliente,
    descricao_produto,
    tipo_peca_id,
    tamanho,
    nivel,
    nome_modelista,
    modelista_id,
    pilotista_id,
    aprovacao,
    observacoes,
    valor,
    valor_modelista,
    data.slice(0, 7)
  );

  revalidatePath('/lancamentos');
  redirect('/lancamentos');
}

export async function atualizarLancamentoAction(formData) {
  const session = requireLogin();
  const id = Number(formData.get('id'));
  const existente = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(id);
  if (!existente) return;

  // Assistente pode editar peça de qualquer mês (ex: corrigir data digitada
  // errado que jogou a peça pro mês errado). Valores em R$ continuam
  // protegidos abaixo, independente do mês.

  const data = formData.get('data')?.toString();
  const referencia = formData.get('referencia')?.toString() || '';
  const cliente = formData.get('cliente')?.toString() || '';
  const descricao_produto = formData.get('descricao_produto')?.toString() || '';
  const tipo_peca_id = Number(formData.get('tipo_peca_id')) || null;
  const tamanho = formData.get('tamanho')?.toString() || '';
  const nivel = formData.get('nivel')?.toString() || '';
  const nome_modelista = formData.get('nome_modelista')?.toString() || '';
  const pilotista_id = Number(formData.get('pilotista_id')) || null;
  const aprovacao = formData.get('aprovacao')?.toString() || 'Pendente';
  const observacoes = formData.get('observacoes')?.toString() || '';

  syncLookup('clientes', cliente);
  syncLookup('tamanhos', tamanho);
  syncLookup('modelistas', nome_modelista);
  const modelista_id = resolverModelistaId(nome_modelista);

  let valor = existente.valor;
  let valor_modelista = existente.valor_modelista;
  if (session.role === 'admin') {
    const valorForm = formData.get('valor');
    valor = valorForm !== null && valorForm !== ''
      ? Number(valorForm)
      : calcularValorPilotista(pilotista_id, tipo_peca_id, nivel);

    const valorModelistaForm = formData.get('valor_modelista');
    valor_modelista = valorModelistaForm !== null && valorModelistaForm !== ''
      ? Number(valorModelistaForm)
      : calcularValorModelista(modelista_id, tipo_peca_id, nivel);
  }

  db.prepare(
    `UPDATE lancamentos SET data=?, referencia=?, cliente=?, descricao_produto=?, tipo_peca_id=?, tamanho=?, nivel=?, nome_modelista=?, modelista_id=?, pilotista_id=?, aprovacao=?, observacoes=?, valor=?, valor_modelista=?, mes_ano=?
     WHERE id=?`
  ).run(
    data,
    referencia,
    cliente,
    descricao_produto,
    tipo_peca_id,
    tamanho,
    nivel,
    nome_modelista,
    modelista_id,
    pilotista_id,
    aprovacao,
    observacoes,
    valor,
    valor_modelista,
    data.slice(0, 7),
    id
  );

  revalidatePath('/lancamentos');
  redirect('/lancamentos');
}

export async function excluirLancamentoAction(formData) {
  const session = requireLogin();
  const id = Number(formData.get('id'));
  const existente = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(id);
  if (!existente) return;

  if (session.role !== 'admin' && existente.mes_ano !== currentMonth()) {
    return;
  }

  db.prepare('DELETE FROM lancamentos WHERE id = ?').run(id);

  revalidatePath('/lancamentos');
  redirect('/lancamentos');
}
