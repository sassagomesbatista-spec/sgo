// Rota temporária de diagnóstico, só pra achar por que um lançamento pegou o
// valor da Regra de Preços padrão em vez da tabela vinculada à pilotista.
// Remover depois de resolver.
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const pilotistas = db.prepare('SELECT id, nome, tabela_preco_id FROM pilotistas ORDER BY nome').all();
  const modelistas = db.prepare('SELECT id, nome, tabela_preco_id FROM modelistas ORDER BY nome').all();
  const tabelas = db.prepare('SELECT id, nome FROM tabelas_preco ORDER BY nome').all();
  const itens = db
    .prepare(
      `SELECT ti.tabela_id, tp.nome AS tabela_nome, t.id AS tipo_peca_id, t.nome AS tipo_peca,
              ti.preco_simples, ti.preco_medio, ti.preco_dificil
       FROM tabela_preco_itens ti
       JOIN tabelas_preco tp ON tp.id = ti.tabela_id
       JOIN tipos_peca t ON t.id = ti.tipo_peca_id
       ORDER BY tp.nome, t.nome`
    )
    .all();
  const ultimosLancamentos = db
    .prepare(
      `SELECT l.id, l.data, l.tipo_peca_id, t.nome AS tipo_peca, l.nivel, l.pilotista_id, p.nome AS pilotista_nome,
              p.tabela_preco_id AS pilotista_tabela_preco_id, l.valor
       FROM lancamentos l
       LEFT JOIN tipos_peca t ON t.id = l.tipo_peca_id
       LEFT JOIN pilotistas p ON p.id = l.pilotista_id
       ORDER BY l.id DESC LIMIT 5`
    )
    .all();

  return NextResponse.json({ pilotistas, modelistas, tabelas, itens, ultimosLancamentos });
}
