import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { salvarPilotistaAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function PilotistasPage() {
  const session = getSession();
  if (session.role !== 'admin') redirect('/lancar');

  const pilotistas = db.prepare('SELECT * FROM pilotistas ORDER BY ativo DESC, nome').all();

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="scissors" />
        </span>
        Pilotistas
      </h1>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Ativo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pilotistas.map((p) => (
              <tr key={p.id}>
                <td colSpan={4}>
                  <form action={salvarPilotistaAction} className="inline-form">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="nome" defaultValue={p.nome} required />
                    <input name="contato" defaultValue={p.contato || ''} placeholder="Whatsapp/telefone" />
                    <label className="checkbox">
                      <input type="checkbox" name="ativo" defaultChecked={!!p.ativo} /> Ativo
                    </label>
                    <button className="btn-sm" type="submit">
                      Salvar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Nova Pilotista</h2>
      <form action={salvarPilotistaAction} className="form">
        <label>
          Nome
          <input name="nome" required />
        </label>
        <label>
          Contato
          <input name="contato" placeholder="Whatsapp/telefone" />
        </label>
        <label className="checkbox">
          <input type="checkbox" name="ativo" defaultChecked /> Ativo
        </label>
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>
    </div>
  );
}
