// Faixas de eficiência inspiradas no padrão da indústria de confecção
// (SAM: peças produzidas x tempo padrão / tempo trabalhado x 100).
// Compartilhado entre telas cliente (PilotagemLive) e servidor (histórico)
// pra nunca divergir a régua de cor entre elas.
export function corEficiencia(pct) {
  if (pct == null) return '';
  if (pct >= 100) return 'efic-boa';
  if (pct >= 75) return 'efic-media';
  return 'efic-baixa';
}
