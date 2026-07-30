import db from '@/lib/db';
import { salvarTamanhoAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function TamanhosPage() {
  const tamanhos = db.prepare('SELECT * FROM tamanhos ORDER BY nome').all();

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="tag" />
        </span>
        Tamanhos
      </h1>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tamanhos.map((t) => (
              <tr key={t.id}>
                <td colSpan={2}>
                  <form action={salvarTamanhoAction} className="inline-form">
                    <input type="hidden" name="id" value={t.id} />
                    <input name="nome" defaultValue={t.nome} required />
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

      <h2>Novo Tamanho</h2>
      <form action={salvarTamanhoAction} className="form">
        <label>
          Nome
          <input name="nome" required />
        </label>
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>
    </div>
  );
}
