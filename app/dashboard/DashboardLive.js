'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/app/icons';
import { corEficiencia } from '@/lib/eficiencia';

const POLL_MS = 6000;

function fmtTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

export default function DashboardLive({ initial }) {
  const [status, setStatus] = useState(initial);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/dashboard/status', { cache: 'no-store' });
        if (res.ok) setStatus(await res.json());
      } catch {
        // mantém o último estado conhecido até a próxima tentativa
      }
    }, POLL_MS);
    const relogio = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(relogio);
    };
  }, []);

  const emAndamento = status.linhas.filter((l) => l.atual);
  const paradas = status.linhas.filter((l) => !l.atual);

  return (
    <div className="live-grid">
      {emAndamento.length === 0 && (
        <p className="subtitle">Nenhuma pilotista costurando agora.</p>
      )}
      {emAndamento.map((l) => {
        let decorrido = null;
        if (l.atual) {
          const inicioMs = new Date(l.atual.iniciado_em).getTime();
          const pausadoMs = l.atual.segundos_pausados * 1000;
          decorrido = fmtTempo((tick - inicioMs - pausadoMs) / 1000);
        }
        return (
          <div key={l.pilotista_id} className={`live-card ${l.atual.pausada ? 'live-paused' : ''}`}>
            <div className="live-card-top">
              <Link href={`/pilotagem/historico?pilotista=${l.pilotista_id}`} className="live-name">
                {l.nome}
              </Link>
              <span className="live-timer">{decorrido}</span>
            </div>
            <p className="subtitle" style={{ margin: '2px 0' }}>
              {l.atual.tipo_nome}
              {l.atual.referencia ? ` · ${l.atual.referencia}` : ''}
            </p>
            {l.atual.pausada && (
              <span className="badge badge-pendente">Pausada — {l.atual.pausa_motivo}</span>
            )}
            <div className="live-card-bottom">
              <span>{l.hoje.pecas} peça(s) hoje</span>
              <span>R$ {l.hoje.valor.toFixed(2)}</span>
              <span className={corEficiencia(l.hoje.eficienciaPct)}>
                {l.hoje.eficienciaPct != null ? `${l.hoje.eficienciaPct}% efic.` : ''}
              </span>
            </div>
          </div>
        );
      })}

      {paradas.length > 0 && (
        <div className="live-idle-list">
          <div className="form-section-label" style={{ marginBottom: 8 }}>
            Sem peça em andamento
          </div>
          {paradas.map((l) => (
            <div key={l.pilotista_id} className="live-idle-row">
              <Link href={`/pilotagem/historico?pilotista=${l.pilotista_id}`}>{l.nome}</Link>
              <span className="subtitle" style={{ margin: 0 }}>
                {l.filaRestante > 0 ? `${l.filaRestante} na fila` : 'fila vazia'} · {l.hoje.pecas} hoje · R${' '}
                {l.hoje.valor.toFixed(2)}
                {l.hoje.eficienciaPct != null && (
                  <span className={corEficiencia(l.hoje.eficienciaPct)}> · {l.hoje.eficienciaPct}% efic.</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
