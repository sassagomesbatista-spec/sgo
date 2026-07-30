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
  if (!nome) return;

  if (id) {
    db.prepare('UPDATE pilotistas SET nome=?, contato=?, ativo=? WHERE id=?').run(
      nome,
      contato,
      ativo,
      id
    );
  } else {
    db.prepare('INSERT INTO pilotistas (nome, contato, ativo) VALUES (?,?,?)').run(
      nome,
      contato,
      ativo
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
  requireLogin();
  const id = formData.get('id');
  const nome = formData.get('nome')?.toString().trim();
  if (!nome) return;
  if (id) {
    db.prepare('UPDATE modelistas SET nome=? WHERE id=?').run(nome, id);
  } else {
    db.prepare('INSERT OR IGNORE INTO modelistas (nome) VALUES (?)').run(nome);
  }
  revalidatePath('/modelistas');
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

  let valor = null;
  const tipo = db.prepare('SELECT * FROM tipos_peca WHERE id = ?').get(tipo_peca_id);
  if (tipo) {
    const map = { Simples: tipo.preco_simples, Médio: tipo.preco_medio, Difícil: tipo.preco_dificil };
    valor = map[nivel] ?? null;
  }

  db.prepare(
    `INSERT INTO lancamentos
      (data, referencia, cliente, descricao_produto, tipo_peca_id, tamanho, nivel, nome_modelista, pilotista_id, aprovacao, observacoes, valor, mes_ano)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    data,
    referencia,
    cliente,
    descricao_produto,
    tipo_peca_id,
    tamanho,
    nivel,
    nome_modelista,
    pilotista_id,
    aprovacao,
    observacoes,
    valor,
    data.slice(0, 7)
  );

  syncLookup('clientes', cliente);
  syncLookup('tamanhos', tamanho);
  syncLookup('modelistas', nome_modelista);

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

  let valor = existente.valor;
  if (session.role === 'admin') {
    const valorForm = formData.get('valor');
    if (valorForm !== null && valorForm !== '') {
      valor = Number(valorForm);
    } else {
      const tipo = db.prepare('SELECT * FROM tipos_peca WHERE id = ?').get(tipo_peca_id);
      const map = { Simples: tipo?.preco_simples, Médio: tipo?.preco_medio, Difícil: tipo?.preco_dificil };
      valor = map[nivel] ?? null;
    }
  }

  db.prepare(
    `UPDATE lancamentos SET data=?, referencia=?, cliente=?, descricao_produto=?, tipo_peca_id=?, tamanho=?, nivel=?, nome_modelista=?, pilotista_id=?, aprovacao=?, observacoes=?, valor=?, mes_ano=?
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
    pilotista_id,
    aprovacao,
    observacoes,
    valor,
    data.slice(0, 7),
    id
  );

  syncLookup('clientes', cliente);
  syncLookup('tamanhos', tamanho);
  syncLookup('modelistas', nome_modelista);

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
