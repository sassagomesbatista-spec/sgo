'use server';

import db from '@/lib/db';
import {
  getSession,
  createSessionToken,
  SESSION_COOKIE,
  hashPassword,
  checkPassword,
  homeFor,
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

// Admin ou assistente — as duas montam lote/lançam peça, só a pilotista fica
// de fora dessas telas (ela tem a dela própria).
function requireEscritorio() {
  const session = requireLogin();
  if (session.role === 'pilotista') throw new Error('Acesso restrito à equipe do escritório.');
  return session;
}

function requirePilotista() {
  const session = requireLogin();
  if (session.role !== 'pilotista' || !session.pilotista_id) {
    throw new Error('Acesso restrito à pilotista.');
  }
  return session;
}

function nowIso() {
  return new Date().toISOString();
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
    pilotista_id: user.pilotista_id || null,
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(homeFor(user.role));
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
  const cargaHoraria = Number(formData.get('carga_horaria_diaria_min')) || 480;
  if (!nome) return;

  let pilotistaId = id ? Number(id) : null;
  if (pilotistaId) {
    db.prepare(
      'UPDATE pilotistas SET nome=?, contato=?, ativo=?, tabela_preco_id=?, carga_horaria_diaria_min=? WHERE id=?'
    ).run(nome, contato, ativo, tabelaPrecoId, cargaHoraria, pilotistaId);
  } else {
    const info = db
      .prepare(
        'INSERT INTO pilotistas (nome, contato, ativo, tabela_preco_id, carga_horaria_diaria_min) VALUES (?,?,?,?,?)'
      )
      .run(nome, contato, ativo, tabelaPrecoId, cargaHoraria);
    pilotistaId = info.lastInsertRowid;
  }

  // Login da pilotista no celular dela: é o escritório que define
  // usuário/senha (nunca a própria pilotista) e passa por WhatsApp. Campos
  // em branco no formulário significam "não mexer no login agora".
  const usuario = formData.get('login_usuario')?.toString().trim();
  const senha = formData.get('login_senha')?.toString() || '';
  if (usuario) {
    const existente = db.prepare('SELECT id, pilotista_id FROM usuarios WHERE usuario = ?').get(usuario);
    if (existente && existente.pilotista_id !== pilotistaId) {
      redirect(`/pilotistas?erro=usuario_em_uso`);
    }
    const loginAtual = db.prepare('SELECT id FROM usuarios WHERE pilotista_id = ?').get(pilotistaId);
    if (loginAtual) {
      if (senha) {
        db.prepare('UPDATE usuarios SET usuario=?, senha_hash=?, nome=? WHERE id=?').run(
          usuario,
          hashPassword(senha),
          nome,
          loginAtual.id
        );
      } else {
        db.prepare('UPDATE usuarios SET usuario=?, nome=? WHERE id=?').run(usuario, nome, loginAtual.id);
      }
    } else if (senha) {
      db.prepare(
        'INSERT INTO usuarios (usuario, senha_hash, role, nome, pilotista_id) VALUES (?,?,?,?,?)'
      ).run(usuario, hashPassword(senha), 'pilotista', nome, pilotistaId);
    }
    // usuário preenchido sem senha e sem login existente: ainda não dá pra
    // criar (precisa de uma senha inicial), formulário simplesmente ignora.
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
  let tempo_simples = parse(formData.get('tempo_padrao_simples'));
  let tempo_medio = parse(formData.get('tempo_padrao_medio'));
  let tempo_dificil = parse(formData.get('tempo_padrao_dificil'));
  if (!nome) return;

  // Se só o preço Médio for informado, calcula Simples (-5%) e Difícil
  // (+20%) automaticamente, seguindo o mesmo padrão dos demais tipos.
  if (preco_medio != null) {
    if (preco_simples == null) preco_simples = Math.round(preco_medio * 0.95);
    if (preco_dificil == null) preco_dificil = Math.round(preco_medio * 1.2);
  }

  // Tempo padrão (SAM): Simples é a base informada; Médio e Difícil, se não
  // preenchidos, sobem 20% em cadeia (Médio = Simples +20%, Difícil = Médio
  // +20%) — mesma lógica que a Samanta descreveu pra pilotagem.
  if (tempo_simples != null) {
    if (tempo_medio == null) tempo_medio = Math.round(tempo_simples * 1.2 * 10) / 10;
    if (tempo_dificil == null) tempo_dificil = Math.round(tempo_medio * 1.2 * 10) / 10;
  }

  if (id) {
    db.prepare(
      `UPDATE tipos_peca SET nome=?, preco_simples=?, preco_medio=?, preco_dificil=?,
        tempo_padrao_simples=?, tempo_padrao_medio=?, tempo_padrao_dificil=? WHERE id=?`
    ).run(nome, preco_simples, preco_medio, preco_dificil, tempo_simples, tempo_medio, tempo_dificil, id);
  } else {
    db.prepare(
      `INSERT INTO tipos_peca
        (nome, preco_simples, preco_medio, preco_dificil, tempo_padrao_simples, tempo_padrao_medio, tempo_padrao_dificil)
       VALUES (?,?,?,?,?,?,?)`
    ).run(nome, preco_simples, preco_medio, preco_dificil, tempo_simples, tempo_medio, tempo_dificil);
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
const NIVEL_TEMPO_COL = {
  Simples: 'tempo_padrao_simples',
  Médio: 'tempo_padrao_medio',
  Difícil: 'tempo_padrao_dificil',
};

function precoPadrao(tipoPecaId, nivel) {
  const col = NIVEL_COL[nivel];
  if (!tipoPecaId || !col) return null;
  const tipo = db.prepare(`SELECT ${col} AS preco FROM tipos_peca WHERE id = ?`).get(tipoPecaId);
  return tipo?.preco ?? null;
}

// SAM (Standard Allowed Minutes) da peça nesse nível — tempo padrão em
// minutos usado pra calcular eficiência. NULL se ninguém preencheu ainda.
function tempoPadraoMinutos(tipoPecaId, nivel) {
  const col = NIVEL_TEMPO_COL[nivel];
  if (!tipoPecaId || !col) return null;
  const tipo = db.prepare(`SELECT ${col} AS tempo FROM tipos_peca WHERE id = ?`).get(tipoPecaId);
  return tipo?.tempo ?? null;
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

  if (session.role !== 'admin' && existente.mes_ano !== currentMonth()) {
    return;
  }

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

// ---------- ORDENS DE PRODUÇÃO (lote) ----------

// A assistente monta o lote pra uma pilotista escolhendo várias peças de
// uma vez (uma linha por peça: tipo, referência, cliente, tamanho, nível,
// quantidade). Chega pra pilotista já com o nome dela, antes dela começar.
export async function criarOrdensAction(formData) {
  requireEscritorio();
  const session = getSession();
  const pilotistaId = Number(formData.get('pilotista_id')) || null;
  if (!pilotistaId) return;

  const tipos = formData.getAll('tipo_peca_id[]');
  const referencias = formData.getAll('referencia[]');
  const clientes = formData.getAll('cliente[]');
  const tamanhos = formData.getAll('tamanho[]');
  const niveis = formData.getAll('nivel[]');
  const quantidades = formData.getAll('quantidade[]');

  const proximaFila = db
    .prepare('SELECT COALESCE(MAX(ordem_fila), 0) AS m FROM ordens_producao WHERE pilotista_id = ?')
    .get(pilotistaId).m;

  const insert = db.prepare(
    `INSERT INTO ordens_producao
      (pilotista_id, tipo_peca_id, referencia, cliente, tamanho, nivel, quantidade, ordem_fila, criado_em, criado_por)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );

  let fila = proximaFila;
  let criadas = 0;
  for (let i = 0; i < tipos.length; i++) {
    const tipoPecaId = Number(tipos[i]) || null;
    const quantidade = Number(quantidades[i]) || 1;
    if (!tipoPecaId) continue;
    fila += 1;
    insert.run(
      pilotistaId,
      tipoPecaId,
      referencias[i]?.toString().trim() || '',
      clientes[i]?.toString().trim() || '',
      tamanhos[i]?.toString().trim() || '',
      niveis[i]?.toString().trim() || '',
      quantidade,
      fila,
      nowIso(),
      session.nome || session.usuario
    );
    criadas += 1;
  }

  if (criadas > 0) {
    for (const c of clientes) syncLookup('clientes', c?.toString().trim());
    revalidatePath('/ordens');
    revalidatePath('/pilotagem');
  }
  redirect('/ordens');
}

export async function reatribuirOrdemAction(formData) {
  requireAdmin();
  const id = Number(formData.get('id'));
  const novoPilotistaId = Number(formData.get('novo_pilotista_id'));
  if (!id || !novoPilotistaId) return;

  const ordem = db.prepare('SELECT * FROM ordens_producao WHERE id = ?').get(id);
  if (!ordem || ordem.status === 'concluido' || ordem.status === 'cancelado') return;

  const emAndamento = db
    .prepare("SELECT id FROM execucoes WHERE ordem_id = ? AND status = 'em_andamento'")
    .get(id);
  if (emAndamento) {
    throw new Error('Essa peça está sendo costurada agora — não dá pra redirecionar até finalizar ou cancelar.');
  }

  const proximaFila = db
    .prepare('SELECT COALESCE(MAX(ordem_fila), 0) AS m FROM ordens_producao WHERE pilotista_id = ?')
    .get(novoPilotistaId).m;

  db.prepare(
    "UPDATE ordens_producao SET pilotista_id=?, ordem_fila=?, status='pendente' WHERE id=?"
  ).run(novoPilotistaId, proximaFila + 1, id);

  revalidatePath('/ordens');
  revalidatePath('/pilotagem');
}

export async function cancelarOrdemAction(formData) {
  requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const emAndamento = db
    .prepare("SELECT id FROM execucoes WHERE ordem_id = ? AND status = 'em_andamento'")
    .get(id);
  if (emAndamento) {
    throw new Error('Essa peça está sendo costurada agora — não dá pra cancelar até finalizar.');
  }
  db.prepare("UPDATE ordens_producao SET status='cancelado' WHERE id=? AND status != 'concluido'").run(id);
  revalidatePath('/ordens');
  revalidatePath('/pilotagem');
}

// ---------- EXECUÇÕES (Iniciar / Pausar / Retomar / Finalizar) ----------

function proximaOrdemDaFila(pilotistaId) {
  return db
    .prepare(
      `SELECT * FROM ordens_producao
       WHERE pilotista_id = ? AND status IN ('pendente','em_andamento') AND quantidade_feita < quantidade
       ORDER BY ordem_fila ASC LIMIT 1`
    )
    .get(pilotistaId);
}

function execucaoAtual(pilotistaId) {
  return db
    .prepare("SELECT * FROM execucoes WHERE pilotista_id = ? AND status = 'em_andamento'")
    .get(pilotistaId);
}

// A pilotista não escolhe a peça — segue a fila na ordem que a assistente
// cadastrou. Por isso essa ação nem recebe qual ordem iniciar: sempre pega
// a próxima da fila dela, calculado aqui, nunca confiando em nada vindo do
// formulário.
export async function iniciarExecucaoAction() {
  const session = requirePilotista();
  if (execucaoAtual(session.pilotista_id)) return; // já tem uma em andamento

  const ordem = proximaOrdemDaFila(session.pilotista_id);
  if (!ordem) return;

  db.prepare("INSERT INTO execucoes (ordem_id, pilotista_id, iniciado_em, status) VALUES (?,?,?,'em_andamento')").run(
    ordem.id,
    session.pilotista_id,
    nowIso()
  );
  if (ordem.status === 'pendente') {
    db.prepare("UPDATE ordens_producao SET status='em_andamento' WHERE id=?").run(ordem.id);
  }
  revalidatePath('/pilotagem');
}

export async function pausarExecucaoAction(formData) {
  const session = requirePilotista();
  const motivo = formData.get('motivo')?.toString().trim() || 'Não informado';
  const exec = execucaoAtual(session.pilotista_id);
  if (!exec) return;
  const pausaAberta = db
    .prepare('SELECT id FROM pausas WHERE execucao_id = ? AND retomada_em IS NULL')
    .get(exec.id);
  if (pausaAberta) return;
  db.prepare('INSERT INTO pausas (execucao_id, motivo, iniciada_em) VALUES (?,?,?)').run(
    exec.id,
    motivo,
    nowIso()
  );
  revalidatePath('/pilotagem');
}

function fecharPausaAberta(execucaoId) {
  const pausa = db
    .prepare('SELECT * FROM pausas WHERE execucao_id = ? AND retomada_em IS NULL')
    .get(execucaoId);
  if (!pausa) return 0;
  const fim = nowIso();
  db.prepare('UPDATE pausas SET retomada_em = ? WHERE id = ?').run(fim, pausa.id);
  const segundos = Math.round((new Date(fim) - new Date(pausa.iniciada_em)) / 1000);
  db.prepare('UPDATE execucoes SET segundos_pausados = segundos_pausados + ? WHERE id = ?').run(
    segundos,
    execucaoId
  );
  return segundos;
}

export async function retomarExecucaoAction() {
  const session = requirePilotista();
  const exec = execucaoAtual(session.pilotista_id);
  if (!exec) return;
  fecharPausaAberta(exec.id);
  revalidatePath('/pilotagem');
}

export async function finalizarExecucaoAction() {
  const session = requirePilotista();
  const exec = execucaoAtual(session.pilotista_id);
  if (!exec) return;

  fecharPausaAberta(exec.id); // se estava pausada, fecha a pausa antes de finalizar

  const atualizado = db.prepare('SELECT * FROM execucoes WHERE id = ?').get(exec.id);
  const ordem = db.prepare('SELECT * FROM ordens_producao WHERE id = ?').get(atualizado.ordem_id);
  const fim = nowIso();
  const segundosTotais = Math.round((new Date(fim) - new Date(atualizado.iniciado_em)) / 1000);
  const segundosTrabalhados = Math.max(0, segundosTotais - atualizado.segundos_pausados);

  const valor = calcularValorPilotista(session.pilotista_id, ordem.tipo_peca_id, ordem.nivel);
  const hoje = fim.slice(0, 10);

  // Eficiência dessa peça (SAM), método padrão da indústria de confecção:
  // % = (peças produzidas x SAM) / minutos trabalhados x 100 — aqui é 1 peça.
  const tempoPadraoMin = tempoPadraoMinutos(ordem.tipo_peca_id, ordem.nivel);
  const minutosTrabalhados = segundosTrabalhados / 60;
  const eficienciaPct =
    tempoPadraoMin != null && minutosTrabalhados > 0
      ? Math.round((tempoPadraoMin / minutosTrabalhados) * 1000) / 10
      : null;

  const info = db
    .prepare(
      `INSERT INTO lancamentos
        (data, referencia, cliente, descricao_produto, tipo_peca_id, tamanho, nivel, nome_modelista, pilotista_id, aprovacao, observacoes, valor, mes_ano, ordem_id, execucao_id, segundos_trabalhados, segundos_pausados, tempo_padrao_min, eficiencia_pct)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      hoje,
      ordem.referencia,
      ordem.cliente,
      '',
      ordem.tipo_peca_id,
      ordem.tamanho,
      ordem.nivel,
      '',
      session.pilotista_id,
      'Pendente',
      'Lançamento automático — Pilotagem em tempo real',
      valor,
      hoje.slice(0, 7),
      ordem.id,
      exec.id,
      segundosTrabalhados,
      atualizado.segundos_pausados,
      tempoPadraoMin,
      eficienciaPct
    );

  db.prepare("UPDATE execucoes SET status='finalizada', finalizado_em=?, lancamento_id=? WHERE id=?").run(
    fim,
    info.lastInsertRowid,
    exec.id
  );

  const quantidadeFeita = ordem.quantidade_feita + 1;
  const concluido = quantidadeFeita >= ordem.quantidade;
  db.prepare('UPDATE ordens_producao SET quantidade_feita = ?, status = ? WHERE id = ?').run(
    quantidadeFeita,
    concluido ? 'concluido' : 'em_andamento',
    ordem.id
  );

  revalidatePath('/pilotagem');
  revalidatePath('/dashboard');
  revalidatePath('/lancamentos');
  revalidatePath('/ordens');

  return {
    tipo_nome: db.prepare('SELECT nome FROM tipos_peca WHERE id = ?').get(ordem.tipo_peca_id)?.nome,
    segundosTrabalhados,
    valor,
    tempoPadraoMin,
    eficienciaPct,
  };
}

// Ela iniciou por engano e quer desfazer — nenhum lançamento existe ainda
// nesse ponto (só nasce no Finalizar), então é só apagar a execução.
export async function cancelarExecucaoAction() {
  const session = requirePilotista();
  const exec = execucaoAtual(session.pilotista_id);
  if (!exec) return;
  db.prepare('DELETE FROM pausas WHERE execucao_id = ?').run(exec.id);
  db.prepare('DELETE FROM execucoes WHERE id = ?').run(exec.id);
  const ordem = db.prepare('SELECT * FROM ordens_producao WHERE id = ?').get(exec.ordem_id);
  if (ordem && ordem.quantidade_feita === 0) {
    db.prepare("UPDATE ordens_producao SET status='pendente' WHERE id=?").run(ordem.id);
  }
  revalidatePath('/pilotagem');
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
