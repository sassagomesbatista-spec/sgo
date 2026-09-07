'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import Icon from '@/app/icons';
import {
  iniciarExecucaoAction,
  pausarExecucaoAction,
  retomarExecucaoAction,
  finalizarExecucaoAction,
  cancelarExecucaoAction,
} from '@/app/actions';

const POLL_MS = 5000;

function fmtTempo(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

export default function PilotagemLive({ initial }) {
  const [status, setStatus] = useState(initial);
  const [tick, setTick] = useState(Date.now());
  const [motivoPausa, setMotivoPausa] = useState('');
  const [pending, startTransition] = useTransition();
  const abortRef = useRef(null);

  async function recarregar() {
    try {
      const res = await fetch('/api/pilotagem/status', { cache: 'no-store' });
      if (res.ok) setStatus(await res.json());
    } catch {
      // Falha de rede momentânea — mantém o último estado conhecido na tela
      // e tenta de novo no próximo ciclo, sem quebrar a tela dela.
    }
  }

  useEffect(() => {
    const poll = setInterval(recarregar, POLL_MS);
    const relogio = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(relogio);
    };
  }, []);

  function rodar(acao, formData) {
    startTransition(async () => {
      await acao(formData);
      await recarregar();
    });
  }

  const exec = status.execucaoAtual;
  const proxima = status.proximaOrdem;

  let elapsedLabel = null;
  if (exec) {
    const inicioMs = new Date(exec.iniciado_em).getTime();
    let pausadoMs = exec.segundos_pausados * 1000;
    if (exec.pausada && exec.pausa_iniciada_em) {
      pausadoMs += tick - new Date(exec.pausa_iniciada_em).getTime();
    }
    const decorridoMs = Math.max(0, tick - inicioMs - pausadoMs);
    elapsedLabel = fmtTempo(decorridoMs / 1000);
  }

  return (
    <div>
      <div className="stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">
            <Icon name="dollar" />
          </div>
          <span className="stat-label">Feito hoje</span>
          <span className="stat-value">R$ {status.hoje.valor.toFixed(2)}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Icon name="list" />
          </div>
          <span className="stat-label">Peças hoje</span>
          <span className="stat-value">{status.hoje.pecas}</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Icon name="boxes" />
          </div>
          <span className="stat-label">Na fila</span>
          <span className="stat-value">{status.filaRestante}</span>
        </div>
      </div>

      {exec && (
        <div className="card timer-card">
          <div className="form-section-label">Costurando agora</div>
          <h2 style={{ margin: '10px 0 2px' }}>{exec.tipo_nome}</h2>
          <p className="subtitle" style={{ marginBottom: 4 }}>
            {[exec.referencia, exec.cliente, exec.tamanho, exec.nivel].filter(Boolean).join(' · ')}
          </p>
          <div className={`timer-display ${exec.pausada ? 'timer-paused' : ''}`}>{elapsedLabel}</div>
          {exec.pausada && (
            <p className="subtitle" style={{ margin: '0 0 8px', color: 'var(--accent-dark)' }}>
              Pausado — {exec.pausa_motivo}
            </p>
          )}

          <div className="timer-actions">
            {!exec.pausada && (
              <>
                <div className="pausa-motivos">
                  {['Problema na máquina', 'Ajuste', 'Outro'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`btn-sm ${motivoPausa === m ? 'motivo-ativo' : ''}`}
                      onClick={() => setMotivoPausa(m)}
                      disabled={pending}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-pause"
                  disabled={pending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set('motivo', motivoPausa || 'Não informado');
                    rodar(pausarExecucaoAction, fd);
                    setMotivoPausa('');
                  }}
                >
                  <Icon name="pause" /> Pausar
                </button>
              </>
            )}
            {exec.pausada && (
              <button
                type="button"
                className="btn"
                disabled={pending}
                onClick={() => rodar(retomarExecucaoAction)}
              >
                <Icon name="play" /> Retomar
              </button>
            )}
            <button
              type="button"
              className="btn btn-finalizar"
              disabled={pending}
              onClick={() => rodar(finalizarExecucaoAction)}
            >
              <Icon name="check" /> Finalizar
            </button>
          </div>
          <button
            type="button"
            className="btn-link"
            style={{ marginTop: 12 }}
            disabled={pending}
            onClick={() => {
              if (confirm('Cancelar essa peça? (comecei por engano)')) rodar(cancelarExecucaoAction);
            }}
          >
            Iniciei por engano, cancelar
          </button>
        </div>
      )}

      {!exec && proxima && (
        <div className="card">
          <div className="form-section-label">Próxima peça da fila</div>
          <h2 style={{ margin: '10px 0 2px' }}>{proxima.tipo_nome}</h2>
          <p className="subtitle" style={{ marginBottom: 4 }}>
            {[proxima.referencia, proxima.cliente, proxima.tamanho, proxima.nivel].filter(Boolean).join(' · ')}
          </p>
          <p className="subtitle">
            {proxima.quantidade_feita} de {proxima.quantidade} feitas nesse lote
          </p>
          <button
            type="button"
            className="btn btn-iniciar"
            disabled={pending}
            onClick={() => rodar(iniciarExecucaoAction)}
          >
            <Icon name="play" /> Iniciar
          </button>
        </div>
      )}

      {!exec && !proxima && (
        <div className="card">
          <p className="subtitle" style={{ margin: 0 }}>
            Nenhuma peça na sua fila agora. Assim que a assistente montar um lote pra você, ele
            aparece aqui.
          </p>
        </div>
      )}
    </div>
  );
}
