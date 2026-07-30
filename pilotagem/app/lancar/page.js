import db from '@/lib/db';
import { criarLancamentoAction } from '@/app/actions';
import SelectOrNew from '@/app/SelectOrNew';
import Icon from '@/app/icons';

export default function LancarPage() {
  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();
  const pilotistas = db.prepare('SELECT * FROM pilotistas WHERE ativo = 1 ORDER BY nome').all();
  const clientes = db.prepare('SELECT nome FROM clientes ORDER BY nome').all().map((c) => c.nome);
  const modelistas = db.prepare('SELECT nome FROM modelistas ORDER BY nome').all().map((m) => m.nome);
  const tamanhos = db.prepare('SELECT nome FROM tamanhos ORDER BY nome').all().map((t) => t.nome);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="plus-circle" />
        </span>
        Lançar Peça
      </h1>
      <p className="subtitle">Preencha os dados da peça pilotada</p>
      <form action={criarLancamentoAction} className="form-grid">
        <div className="field-full form-section-label">Identificação</div>
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
          <SelectOrNew name="cliente" options={clientes} />
        </label>
        <label>
          Descrição do Produto
          <input name="descricao_produto" placeholder="ex: short soltinho estampado" />
        </label>

        <div className="field-full form-section-label">Peça</div>
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
          <SelectOrNew name="tamanho" options={tamanhos} />
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

        <div className="field-full form-section-label">Produção</div>
        <label>
          Nome da Modelista
          <SelectOrNew name="nome_modelista" options={modelistas} />
        </label>
        <label>
          Aprovação
          <select name="aprovacao" defaultValue="Pendente">
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Reprovado">Reprovado</option>
          </select>
        </label>
        <label className="field-full">
          Observações
          <textarea name="observacoes" rows={3}></textarea>
        </label>

        <button className="btn field-full" type="submit">
          Salvar Peça
        </button>
      </form>
    </div>
  );
}
