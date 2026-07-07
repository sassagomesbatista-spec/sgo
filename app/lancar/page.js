import db from '@/lib/db';
import { criarLancamentoAction } from '@/app/actions';

export default function LancarPage() {
  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();
  const pilotistas = db.prepare('SELECT * FROM pilotistas WHERE ativo = 1 ORDER BY nome').all();
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="card">
      <h1>Lançar Peça</h1>
      <p className="subtitle">Preencha os dados da peça pilotada</p>
      <form action={criarLancamentoAction} className="form">
        <label>
          Data
          <input type="date" name="data" defaultValue={hoje} required />
        </label>
        <label>
          Referência
          <input name="referencia" placeholder="ex: 240604" />
        </label>
        <label>
          Cliente
          <input name="cliente" />
        </label>
        <label>
          Descrição do Produto
          <input name="descricao_produto" placeholder="ex: short soltinho estampado" />
        </label>
        <label>
          Tipo de Peça
          <select name="tipo_peca_id" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tamanho
          <input name="tamanho" placeholder="P / M / G ou número" />
        </label>
        <label>
          Nível
          <select name="nivel" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            <option value="Simples">Simples</option>
            <option value="Médio">Médio</option>
            <option value="Difícil">Difícil</option>
          </select>
        </label>
        <label>
          Nome da Modelista
          <input name="nome_modelista" />
        </label>
        <label>
          Pilotista
          <select name="pilotista_id" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {pilotistas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Aprovação
          <select name="aprovacao" defaultValue="Pendente">
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Reprovado">Reprovado</option>
          </select>
        </label>
        <label>
          Observações
          <textarea name="observacoes" rows={3}></textarea>
        </label>
        <button className="btn" type="submit">
          Salvar Peça
        </button>
      </form>
    </div>
  );
}
