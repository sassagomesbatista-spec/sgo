import Database from 'better-sqlite3';
import path from 'path';
import { hashPassword } from './auth';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'pilotagem.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','assistente')),
  nome TEXT
);

CREATE TABLE IF NOT EXISTS pilotistas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  contato TEXT,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tipos_peca (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT UNIQUE NOT NULL,
  preco_simples REAL,
  preco_medio REAL,
  preco_dificil REAL
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
`);

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
  ];
  for (const t of tipos) insertTipo.run(...t);
}
seed();

export default db;
