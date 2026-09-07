import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { hashPassword } from './auth';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'pilotagem.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath, { timeout: 10000 });
try {
  db.pragma('journal_mode = WAL');
} catch {
  // Concurrent process racing to set WAL mode on first creation (e.g. Next.js
  // build workers); harmless to skip, the running server re-opens the file.
}

try {
  db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','assistente','pilotista')),
  nome TEXT,
  pilotista_id INTEGER,
  FOREIGN KEY(pilotista_id) REFERENCES pilotistas(id)
);

CREATE TABLE IF NOT EXISTS pilotistas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  contato TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

-- Ordem de produção (lote): a assistente monta, atribuída a uma pilotista,
-- ANTES dela começar a costurar. Cada linha é um item de lote (um tipo de
-- peça + quantidade); a fila da pilotista percorre os itens abertos em
-- ordem de criação (FIFO), ela não escolhe pular pra frente.
CREATE TABLE IF NOT EXISTS ordens_producao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pilotista_id INTEGER NOT NULL,
  tipo_peca_id INTEGER NOT NULL,
  referencia TEXT,
  cliente TEXT,
  tamanho TEXT,
  nivel TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  quantidade_feita INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','em_andamento','concluido','cancelado')),
  observacoes TEXT,
  ordem_fila INTEGER NOT NULL,
  criado_em TEXT NOT NULL,
  criado_por TEXT,
  FOREIGN KEY(pilotista_id) REFERENCES pilotistas(id),
  FOREIGN KEY(tipo_peca_id) REFERENCES tipos_peca(id)
);

-- Uma execução = uma peça individual sendo cronometrada (Iniciar -> Finalizar)
-- contra um item de ordens_producao. Só uma "em_andamento" por pilotista.
CREATE TABLE IF NOT EXISTS execucoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ordem_id INTEGER NOT NULL,
  pilotista_id INTEGER NOT NULL,
  iniciado_em TEXT NOT NULL,
  finalizado_em TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK(status IN ('em_andamento','finalizada','cancelada')),
  segundos_pausados INTEGER NOT NULL DEFAULT 0,
  lancamento_id INTEGER,
  FOREIGN KEY(ordem_id) REFERENCES ordens_producao(id),
  FOREIGN KEY(pilotista_id) REFERENCES pilotistas(id),
  FOREIGN KEY(lancamento_id) REFERENCES lancamentos(id)
);

-- Intervalos de pausa dentro de uma execução (máquina quebrou, ajuste, etc.)
-- Enquanto retomada_em for NULL, a execução está pausada.
CREATE TABLE IF NOT EXISTS pausas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execucao_id INTEGER NOT NULL,
  motivo TEXT,
  iniciada_em TEXT NOT NULL,
  retomada_em TEXT,
  FOREIGN KEY(execucao_id) REFERENCES execucoes(id)
);

CREATE TABLE IF NOT EXISTS tipos_peca (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL,
  preco_simples REAL,
  preco_medio REAL,
  preco_dificil REAL
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS modelistas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS tamanhos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  referencia TEXT,
  cliente TEXT,
  descricao_produto TEXT,
  tipo_peca_id INTEGER,
  tamanho TEXT,
  nivel TEXT,
  nome_modelista TEXT,
  pilotista_id INTEGER,
  aprovacao TEXT,
  observacoes TEXT,
  valor REAL,
  mes_ano TEXT,
  FOREIGN KEY(tipo_peca_id) REFERENCES tipos_peca(id),
  FOREIGN KEY(pilotista_id) REFERENCES pilotistas(id)
);

-- Tabelas de preço nomeadas (além da Regra de Preços padrão em tipos_peca):
-- cada modelista ou pilotista pode ter a sua própria, com valores diferentes
-- por tipo de peça/nível. Quem não tem tabela própria vinculada continua
-- usando a Regra de Preços padrão, exatamente como antes.
CREATE TABLE IF NOT EXISTS tabelas_preco (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS tabela_preco_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabela_id INTEGER NOT NULL,
  tipo_peca_id INTEGER NOT NULL,
  preco_simples REAL,
  preco_medio REAL,
  preco_dificil REAL,
  UNIQUE(tabela_id, tipo_peca_id),
  FOREIGN KEY(tabela_id) REFERENCES tabelas_preco(id),
  FOREIGN KEY(tipo_peca_id) REFERENCES tipos_peca(id)
);
`);
} catch {
  // Same build-time race as above.
}

// Colunas novas em tabelas que já existiam antes das tabelas de preço por
// profissional (ALTER TABLE não tem "IF NOT EXISTS" no SQLite).
function ensureColumn(table, column, ddlType) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  }
}

try {
  ensureColumn('pilotistas', 'tabela_preco_id', 'INTEGER');
  ensureColumn('modelistas', 'tabela_preco_id', 'INTEGER');
  ensureColumn('lancamentos', 'modelista_id', 'INTEGER');
  ensureColumn('lancamentos', 'valor_modelista', 'REAL');
  ensureColumn('usuarios', 'pilotista_id', 'INTEGER');
  // Rastro da pilotagem em tempo real: de qual ordem/execução esse
  // lançamento nasceu (fica NULL nos lançamentos antigos, feitos à mão) e
  // quanto tempo ela levou de fato.
  ensureColumn('lancamentos', 'ordem_id', 'INTEGER');
  ensureColumn('lancamentos', 'execucao_id', 'INTEGER');
  ensureColumn('lancamentos', 'segundos_trabalhados', 'INTEGER');
  ensureColumn('lancamentos', 'segundos_pausados', 'INTEGER');
} catch {
  // Same build-time race as above.
}

// Bancos criados antes do login de pilotista existir têm a tabela `usuarios`
// com CHECK(role IN ('admin','assistente')) gravado no schema desde a
// criação — mudar o texto do CREATE TABLE acima não afeta quem já existe no
// disco. SQLite não faz ALTER de CHECK, então recria a tabela quando
// detecta a restrição antiga (idempotente: já migrado, pula direto).
function migrarCheckRoleUsuarios() {
  const info = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='usuarios'")
    .get();
  if (info && info.sql && !info.sql.includes("'pilotista'")) {
    db.exec(`
      ALTER TABLE usuarios RENAME TO usuarios_old_role_migration;
      CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','assistente','pilotista')),
        nome TEXT,
        pilotista_id INTEGER,
        FOREIGN KEY(pilotista_id) REFERENCES pilotistas(id)
      );
      INSERT INTO usuarios (id, usuario, senha_hash, role, nome, pilotista_id)
        SELECT id, usuario, senha_hash, role, nome, pilotista_id FROM usuarios_old_role_migration;
      DROP TABLE usuarios_old_role_migration;
    `);
  }
}

try {
  migrarCheckRoleUsuarios();
} catch {
  // Same build-time race as above.
}

function seed() {
  const insertUsuario = db.prepare(
    'INSERT OR IGNORE INTO usuarios (usuario, senha_hash, role, nome) VALUES (?,?,?,?)'
  );
  insertUsuario.run('admin', hashPassword('admin123'), 'admin', 'Administradora');
  insertUsuario.run('assistente', hashPassword('assist123'), 'assistente', 'Assistente');

  const insertTipo = db.prepare(
    'INSERT OR IGNORE INTO tipos_peca (nome, preco_simples, preco_medio, preco_dificil) VALUES (?,?,?,?)'
  );
  const tipos = [
    ['Blusa Manga Curta', 52, 55, 66],
    ['Casaco Zíper/Capuz', 86, 90, 108],
    ['Legging', 36, 38, 46],
    ['Macacão', 90, 95, 115],
    ['Macaquinho', 81, 85, 102],
    ['Regata', 52, 55, 66],
    ['Short', 65, 72, 80],
    ['Short Saia', 65, 80, 95],
    ['Top', 52, 55, 66],
    ['Flair', null, null, null],
    ['Blusa Manga Longa', null, null, null],
    ['Colete Zíper/Capuz', null, null, null],
    ['Calça Solta', null, null, null],
    ['Sutiã', 50, 50, 50],
    ['Calcinha', 35, 35, 35],
  ];
  for (const t of tipos) insertTipo.run(...t);

  const insertCliente = db.prepare('INSERT OR IGNORE INTO clientes (nome) VALUES (?)');
  const clientes = [
    'Peel Padel', 'Gomax', 'Ausdauer', 'Mafort', 'Físico Fitness', 'Go Fish',
    'Storm', 'Vtryn', 'Blond Active', 'Stamina', 'Escritório', 'PL', 'Anchi',
    'Aura Move', 'Driph', 'Fit One', 'Mafê', 'Mazzar', 'Pitaya', 'Sabrina',
    'Uzya', 'Milenne', 'Tutule', 'Wolves', 'Aldra', 'Moovset', 'Gislane',
    'Sculpta', 'Nogi',
  ];
  for (const c of clientes) insertCliente.run(c);

  const insertTamanho = db.prepare('INSERT OR IGNORE INTO tamanhos (nome) VALUES (?)');
  const tamanhos = ['PP', 'P', 'M', 'G', 'GG', 'XG'];
  for (const t of tamanhos) insertTamanho.run(t);
}

try {
  seed();
} catch {
  // Same build-time race as above; the running server seeds successfully
  // on its own single, uncontended connection.
}

// Correção pontual de preços com base no relatório de pagamento de
// junho/2026 (fonte confirmada como correta). Só aplica se o valor
// ainda estiver no original de cadastro, pra não sobrescrever ajustes
// manuais feitos depois pela admin.
function corrigirPrecos() {
  // Passo 1: valor original do cadastro -> valor confirmado no relatório
  // de junho/2026, usado como Médio (mesmo valor nos 3 níveis nesse passo).
  db.prepare(
    "UPDATE tipos_peca SET preco_simples=37, preco_medio=37, preco_dificil=37 WHERE nome='Short' AND preco_simples=65 AND preco_medio=72 AND preco_dificil=80"
  ).run();
  db.prepare(
    "UPDATE tipos_peca SET preco_simples=45, preco_medio=45, preco_dificil=45 WHERE nome='Short Saia' AND preco_simples=65 AND preco_medio=80 AND preco_dificil=95"
  ).run();

  // Passo 2: aplica a mesma proporção usada nos demais tipos de peça
  // (Simples = Médio -5%, Difícil = Médio +20%) sobre o valor confirmado.
  db.prepare(
    "UPDATE tipos_peca SET preco_simples=35, preco_dificil=44 WHERE nome='Short' AND preco_simples=37 AND preco_medio=37 AND preco_dificil=37"
  ).run();
  db.prepare(
    "UPDATE tipos_peca SET preco_simples=43, preco_dificil=54 WHERE nome='Short Saia' AND preco_simples=45 AND preco_medio=45 AND preco_dificil=45"
  ).run();
  db.prepare(
    "UPDATE tipos_peca SET preco_simples=33, preco_dificil=42 WHERE nome='Calcinha' AND preco_simples=35 AND preco_medio=35 AND preco_dificil=35"
  ).run();
  db.prepare(
    "UPDATE tipos_peca SET preco_simples=48, preco_dificil=60 WHERE nome='Sutiã' AND preco_simples=50 AND preco_medio=50 AND preco_dificil=50"
  ).run();

  db.prepare(
    "UPDATE tipos_peca SET preco_dificil=45 WHERE nome='Legging' AND preco_dificil=46"
  ).run();
}

try {
  corrigirPrecos();
} catch {
  // Same build-time race as above.
}

// Reset temporário da senha do admin (esqueceu a senha em 28/08).
// REMOVER esse bloco depois que ela confirmar o login com a senha nova.
try {
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE usuario = ?').run(
    hashPassword('reset1234'),
    'admin'
  );
} catch {
  // Same build-time race as above.
}

// ---------- Backup automático diário ----------

const BACKUP_DIR = path.join(dbDir, 'backups');
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const BACKUP_RETENTION_DAYS = 30;

function runScheduledBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    const dest = path.join(BACKUP_DIR, `pilotagem-${today}.db`);
    if (!fs.existsSync(dest)) {
      // Backup síncrono via VACUUM INTO em vez de db.backup() (assíncrono):
      // esse último tem um bug conhecido no better-sqlite3 que derruba o
      // processo inteiro com "Assertion failed: (env) != nullptr" em certas
      // combinações de versão do Node — sempre que o backup do dia ainda não
      // existia (primeira execução após reiniciar). VACUUM INTO faz a mesma
      // cópia consistente, mas de forma síncrona, sem esse risco.
      db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    }
    const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const file of fs.readdirSync(BACKUP_DIR)) {
      const filePath = path.join(BACKUP_DIR, file);
      if (fs.statSync(filePath).mtimeMs < cutoff) fs.unlinkSync(filePath);
    }
  } catch {
    // Backup automático é best-effort; nunca deve derrubar o servidor.
  }
}

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
if (!isBuildPhase && !globalThis.__pilotagemBackupScheduled) {
  globalThis.__pilotagemBackupScheduled = true;
  runScheduledBackup();
  setInterval(runScheduledBackup, BACKUP_INTERVAL_MS);
}

export { BACKUP_DIR };
export default db;
