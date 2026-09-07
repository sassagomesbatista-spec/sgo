import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return new NextResponse('Não autorizado', { status: 403 });
  }

  const { linhas } = await request.json();
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return NextResponse.json({ atualizados: 0, criados: 0 });
  }

  const existente = db.prepare('SELECT id FROM tipos_peca WHERE nome = ?');
  const atualizar = db.prepare(
    'UPDATE tipos_peca SET preco_simples=?, preco_medio=?, preco_dificil=? WHERE nome=?'
  );
  const inserir = db.prepare(
    'INSERT INTO tipos_peca (nome, preco_simples, preco_medio, preco_dificil) VALUES (?,?,?,?)'
  );

  let atualizados = 0;
  let criados = 0;
  const transacao = db.transaction((rows) => {
    for (const r of rows) {
      if (!r.nome) continue;
      const jaExiste = existente.get(r.nome);
      if (jaExiste) {
        atualizar.run(r.preco_simples, r.preco_medio, r.preco_dificil, r.nome);
        atualizados += 1;
      } else {
        inserir.run(r.nome, r.preco_simples, r.preco_medio, r.preco_dificil);
        criados += 1;
      }
    }
  });
  transacao(linhas);

  return NextResponse.json({ atualizados, criados });
}
