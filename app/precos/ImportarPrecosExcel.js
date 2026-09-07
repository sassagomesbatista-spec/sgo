'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import Icon from '@/app/icons';

function normalizarChave(s) {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const ALIASES = {
  nome: ['tipo de peca', 'tipo', 'nome', 'peca'],
  preco_simples: ['preco simples', 'simples'],
  preco_medio: ['preco medio', 'medio'],
  preco_dificil: ['preco dificil', 'dificil'],
  tempo_padrao_simples: ['tempo padrao simples', 'tempo simples', 'sam simples'],
  tempo_padrao_medio: ['tempo padrao medio', 'tempo medio', 'sam medio'],
  tempo_padrao_dificil: ['tempo padrao dificil', 'tempo dificil', 'sam dificil'],
};

function mapLinha(row) {
  const chaves = Object.keys(row);
  const achar = (aliases) => {
    const chave = chaves.find((k) => aliases.includes(normalizarChave(k)));
    return chave ? row[chave] : undefined;
  };
  const nome = achar(ALIASES.nome);
  if (!nome) return null;
  const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));
  return {
    nome: nome.toString().trim(),
    preco_simples: num(achar(ALIASES.preco_simples)),
    preco_medio: num(achar(ALIASES.preco_medio)),
    preco_dificil: num(achar(ALIASES.preco_dificil)),
    tempo_padrao_simples: num(achar(ALIASES.tempo_padrao_simples)),
    tempo_padrao_medio: num(achar(ALIASES.tempo_padrao_medio)),
    tempo_padrao_dificil: num(achar(ALIASES.tempo_padrao_dificil)),
  };
}

export default function ImportarPrecosExcel() {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const linhas = rows.map(mapLinha).filter(Boolean);

      if (linhas.length === 0) {
        setStatus({ erro: true, msg: 'Não achei nenhuma linha com "Tipo de Peça" preenchido nessa planilha.' });
        return;
      }

      const res = await fetch('/api/precos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas }),
      });
      if (!res.ok) {
        setStatus({ erro: true, msg: 'Não deu pra importar — tenta de novo.' });
        return;
      }
      const data = await res.json();
      setStatus({ erro: false, msg: `${data.atualizados} atualizados, ${data.criados} novos.` });
      router.refresh();
    } catch (err) {
      setStatus({ erro: true, msg: 'Não consegui ler esse arquivo — confirma se é um .xlsx/.xls/.csv válido.' });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label className="btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <Icon name="upload" />
        {loading ? 'Importando...' : 'Escolher planilha (.xlsx/.csv)'}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          disabled={loading}
          style={{ display: 'none' }}
        />
      </label>
      {status && (
        <p className={status.erro ? 'error' : 'subtitle'} style={{ marginTop: 8 }}>
          {status.msg}
        </p>
      )}
    </div>
  );
}
