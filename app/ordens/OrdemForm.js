'use client';

import { useState } from 'react';
import { criarOrdensAction } from '@/app/actions';

function linhaVazia() {
  return { key: Math.random().toString(36).slice(2), tipo_peca_id: '', referencia: '', cliente: '', tamanho: '', nivel: '', quantidade: 1 };
}

export default function OrdemForm({ pilotistas, tipos, clientes, tamanhos }) {
  const [linhas, setLinhas] = useState([linhaVazia()]);

  function atualizar(key, campo, valor) {
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  }

  function adicionar() {
    setLinhas((ls) => [...ls, linhaVazia()]);
  }

  function remover(key) {
    setLinhas((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }

  return (
    <form action={criarOrdensAction} className="form">
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

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo de Peça</th>
              <th>Referência</th>
              <th>Cliente</th>
              <th>Tamanho</th>
              <th>Nível</th>
              <th>Qtd.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.key}>
                <td>
                  <select
                    name="tipo_peca_id[]"
                    required
                    value={l.tipo_peca_id}
                    onChange={(e) => atualizar(l.key, 'tipo_peca_id', e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    name="referencia[]"
                    placeholder="ex: 240604"
                    value={l.referencia}
                    onChange={(e) => atualizar(l.key, 'referencia', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    name="cliente[]"
                    list="ordem-clientes"
                    value={l.cliente}
                    onChange={(e) => atualizar(l.key, 'cliente', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    name="tamanho[]"
                    list="ordem-tamanhos"
                    value={l.tamanho}
                    onChange={(e) => atualizar(l.key, 'tamanho', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    name="nivel[]"
                    value={l.nivel}
                    onChange={(e) => atualizar(l.key, 'nivel', e.target.value)}
                  >
                    <option value="">-</option>
                    <option value="Simples">Simples</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    name="quantidade[]"
                    value={l.quantidade}
                    onChange={(e) => atualizar(l.key, 'quantidade', e.target.value)}
                  />
                </td>
                <td>
                  <button type="button" className="btn-link" onClick={() => remover(l.key)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <datalist id="ordem-clientes">
        {clientes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="ordem-tamanhos">
        {tamanhos.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn-sm" onClick={adicionar}>
          + Adicionar peça
        </button>
      </div>

      <button className="btn" type="submit">
        Criar Lote
      </button>
    </form>
  );
}
